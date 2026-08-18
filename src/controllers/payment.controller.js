const prisma = require("../config/prisma");
const { config, isPaymentConfigured } = require("../config/payment");
const epointClient = require("../services/epointClient");

const AMOUNT_TOLERANCE = 0.01;

// How long a PENDING payment blocks a new attempt for the same order. Without
// this, refreshing/reopening the payment page in a new tab (STEP10) could
// create a second live payment attempt while the first is still awaiting its
// webhook, and if both later succeed the order would be charged twice
// (STEP16 - two payments must never be PAID simultaneously for one order).
// A stale/abandoned attempt (customer closed the bank tab, webhook never
// arrives) still has to be retryable eventually, so the block expires rather
// than being permanent.
const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000;

// =======================
// CREATE PAYMENT (customer)
// =======================
//
// Client sends only orderId. The charge amount is always order.total_price
// read fresh from the DB - a client-sent amount/price/discount is never
// accepted or even read here.

exports.createPayment = async (req, res) => {

    try {

        const { orderId, language } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "orderId is required" });
        }

        const order = await prisma.orders.findUnique({ where: { id: orderId } });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        if (order.status === "Cancelled") {
            return res.status(409).json({
                success: false,
                code: "ORDER_CANCELLED",
                message: "This order has been cancelled"
            });
        }

        const existingPaid = await prisma.payments.findFirst({
            where: { order_id: orderId, status: "PAID" }
        });

        if (existingPaid) {
            return res.status(409).json({
                success: false,
                code: "ALREADY_PAID",
                message: "This order has already been paid"
            });
        }

        // A still-PENDING payment for this order means a checkout attempt is
        // already in flight (page refresh, browser back/forward, or the
        // payment page reopened in a new tab all land back here). Without
        // this guard a second attempt could also succeed at the bank, paying
        // the same order twice. If the first attempt is old enough that it
        // was very likely abandoned (bank tab closed, webhook never coming),
        // it stops blocking so the customer isn't locked out forever.
        const existingPending = await prisma.payments.findFirst({
            where: { order_id: orderId, status: "PENDING" },
            orderBy: { created_at: "desc" }
        });

        if (existingPending && Date.now() - existingPending.created_at.getTime() < PENDING_PAYMENT_TTL_MS) {
            return res.status(409).json({
                success: false,
                code: "PAYMENT_IN_PROGRESS",
                message: "A payment is already in progress for this order",
                data: { paymentId: existingPending.id }
            });
        }

        if (!isPaymentConfigured()) {
            return res.status(503).json({
                success: false,
                code: "PAYMENT_NOT_CONFIGURED",
                message: "Payment provider is not configured yet"
            });
        }

        // The amount charged is always the server-authoritative order total -
        // items + delivery fee - promo/gift-card discount, all resolved by
        // createOrder in Phase 16/17. Never the client's own arithmetic.
        const amount = Number(order.total_price);

        const resolvedLanguage = ["az", "en", "ru"].includes(language) ? language : "az";

        const payment = await prisma.payments.create({
            data: {
                order_id: order.id,
                amount,
                currency: "AZN",
                status: "PENDING",
                provider: config.provider
            }
        });

        let providerResponse;

        try {

            providerResponse = await epointClient.createPayment({
                amount,
                currency: "AZN",
                language: resolvedLanguage,
                // Epoint's order_id identifies this attempt on their side - our
                // internal payment.id, not the VibeBook order id, so a retried
                // payment attempt after a failure gets its own clean identifier
                // and the webhook can map back to exactly one payments row.
                orderId: payment.id,
                description: `VibeBook order ${order.id.slice(0, 8)}`,
                successRedirectUrl: `${config.successUrl}?paymentId=${payment.id}`,
                errorRedirectUrl: `${config.errorUrl}?paymentId=${payment.id}`
            });

        } catch (providerErr) {

            console.log("Epoint createPayment request failed:", providerErr.message);

            await prisma.payments.update({
                where: { id: payment.id },
                data: { status: "FAILED" }
            });

            return res.status(502).json({
                success: false,
                code: "PROVIDER_UNREACHABLE",
                message: "Could not reach the payment provider"
            });

        }

        const { httpStatus, body } = providerResponse;

        if (httpStatus !== 200 || body.status !== "success") {

            await prisma.payments.update({
                where: { id: payment.id },
                data: { status: "FAILED" }
            });

            return res.status(502).json({
                success: false,
                code: "PROVIDER_ERROR",
                message: body?.message || "Payment provider rejected the request"
            });

        }

        await prisma.payments.update({
            where: { id: payment.id },
            data: { provider_transaction_id: body.transaction }
        });

        res.status(201).json({

            success: true,

            data: {
                paymentId: payment.id,
                redirectUrl: body.redirect_url
            }

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

// =======================
// GET PAYMENT STATUS (customer polls after provider redirect)
// =======================
//
// The frontend must never trust a `success=true`-style URL query parameter
// from the provider redirect. This is the only source of truth it may use,
// and it in turn only reflects what the webhook has actually confirmed.

exports.getPaymentStatus = async (req, res) => {

    try {

        const payment = await prisma.payments.findUnique({
            where: { id: req.params.id },
            include: { orders: true }
        });

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        if (payment.orders.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        res.json({

            success: true,

            data: {
                id: payment.id,
                orderId: payment.order_id,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                provider: payment.provider,
                providerTransactionId: payment.provider_transaction_id,
                createdAt: payment.created_at,
                updatedAt: payment.updated_at
            }

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

// =======================
// WEBHOOK (Epoint server-to-server callback, no auth - signature-gated)
// =======================

exports.webhook = async (req, res) => {

    try {

        const { data, signature } = req.body;

        if (!data || !signature) {
            return res.status(400).json({ success: false, message: "Missing data or signature" });
        }

        if (!isPaymentConfigured()) {
            return res.status(503).json({ success: false, message: "Payment provider is not configured" });
        }

        if (!epointClient.verifySignature(data, signature)) {
            // Invalid signature: reject outright, never touch any payment row.
            return res.status(401).json({ success: false, message: "Invalid signature" });
        }

        const decoded = epointClient.decodeData(data);

        // decoded.order_id is our internal payments.id - see createPayment.
        const payment = await prisma.payments.findUnique({ where: { id: decoded.order_id } });

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        // Idempotency: a payment already in a terminal state ignores further
        // callbacks entirely - a duplicate/replayed webhook can never move a
        // payment from PAID back to any other state or process twice. This
        // is only a fast-path check, not the actual guarantee - see the
        // atomic updateMany below for that.
        if (["PAID", "FAILED", "REFUNDED"].includes(payment.status)) {
            return res.status(200).json({ success: true, message: "Already processed" });
        }

        const callbackAmount = Number(decoded.amount);
        const expectedAmount = Number(payment.amount);

        if (Math.abs(callbackAmount - expectedAmount) > AMOUNT_TOLERANCE) {

            // Amount does not match what this payment was created for - this
            // is either provider/data corruption or tampering. Acknowledge
            // receipt (200, so Epoint stops retrying) but do NOT mark PAID;
            // the payment stays PENDING for manual review.
            console.log(
                `Payment amount mismatch for ${payment.id}: expected ${expectedAmount}, got ${callbackAmount}`
            );

            return res.status(200).json({ success: true, message: "Amount mismatch - not processed" });

        }

        const newStatus = decoded.status === "success" ? "PAID" : "FAILED";

        // The findUnique + status check above is only an optimization - two
        // webhook deliveries arriving at (nearly) the same instant could both
        // read PENDING before either writes. The actual idempotency guarantee
        // is this single atomic UPDATE with the status re-checked in the same
        // WHERE clause: only the request that "wins" the row actually applies
        // its change, and Postgres guarantees exactly one caller sees count=1.
        const result = await prisma.payments.updateMany({

            where: {
                id: payment.id,
                status: { notIn: ["PAID", "FAILED", "REFUNDED"] }
            },

            data: {
                status: newStatus,
                provider_transaction_id: decoded.transaction || payment.provider_transaction_id,
                method: decoded.card_mask ? "card" : payment.method
            }

        });

        if (result.count === 0) {
            return res.status(200).json({ success: true, message: "Already processed" });
        }

        res.status(200).json({ success: true });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
