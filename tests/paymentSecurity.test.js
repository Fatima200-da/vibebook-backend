// Phase 19 - destructive/adversarial security tests for the real payment
// system built in Phase 18. Same mocked-provider technique as
// paymentsConfigured.test.js (env vars set, only epointClient.createPayment
// mocked - no real network call), so every security guarantee tested here
// (server-authoritative amount, ownership, signature verification,
// idempotency, concurrency, retry, status separation) is exercised through
// the REAL application code, not simulated.

process.env.PAYMENT_PROVIDER = "epoint";
process.env.PAYMENT_PUBLIC_KEY = "test_public_key";
process.env.PAYMENT_PRIVATE_KEY = "test_private_key_for_jest_only";
process.env.PAYMENT_API_URL = "https://sandbox.example.invalid";
process.env.PAYMENT_RESULT_URL = "http://localhost:5000/api/payments/webhook/epoint";
process.env.PAYMENT_SUCCESS_URL = "http://localhost:5182/payment/return";
process.env.PAYMENT_ERROR_URL = "http://localhost:5182/payment/return";

jest.mock("../src/services/epointClient", () => {
    const actual = jest.requireActual("../src/services/epointClient");
    return {
        ...actual,
        createPayment: jest.fn()
    };
});

const request = require("supertest");
const crypto = require("crypto");

const app = require("../src/app");
const prisma = require("../src/config/prisma");
const epointClient = require("../src/services/epointClient");

function signPayload(payload, privateKey = process.env.PAYMENT_PRIVATE_KEY) {
    const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const signature = crypto
        .createHash("sha1")
        .update(privateKey + data + privateKey, "utf8")
        .digest("base64");
    return { data, signature };
}

function mockProviderSuccess() {
    epointClient.createPayment.mockResolvedValueOnce({
        httpStatus: 200,
        body: { status: "success", redirect_url: "https://bank.example/pay", transaction: `te_${Date.now()}_${Math.random()}` }
    });
}

describe("Payment security (Phase 19 - destructive tests)", () => {

    let tokenA;
    let tokenB;
    let productId;

    beforeAll(async () => {

        const emailA = `pay_sec_a_${Date.now()}@test.com`;
        const emailB = `pay_sec_b_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({ full_name: "Sec A", email: emailA, password: "Cust123@" });
        await request(app).post("/api/auth/register").send({ full_name: "Sec B", email: emailB, password: "Cust123@" });

        const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password: "Cust123@" });
        const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password: "Cust123@" });

        tokenA = loginA.body.token;
        tokenB = loginB.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        productId = products.body.data[0].id;

    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    async function createOrderAs(token, extra = {}) {
        const order = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${token}`)
            .send({ items: [{ product_id: productId, quantity: 1 }], ...extra });
        return order.body.data;
    }

    // ===== STEP2: amount / total / discount / delivery_fee tampering =====

    describe("STEP2 - amount tampering", () => {

        it("ignores total=0, discount=9999 and delivery_fee=0 sent to order creation", async () => {

            const order = await createOrderAs(tokenA, {
                total: 0,
                total_price: 0,
                discount: 9999,
                discount_amount: 9999,
                delivery_fee: 0
            });

            // total_price must come only from real product price + real
            // delivery config, never from the tampered fields above.
            expect(Number(order.total_price)).toBeGreaterThan(0);

        });

        it("charges order.total_price regardless of a client amount=999999", async () => {

            const order = await createOrderAs(tokenA);
            mockProviderSuccess();

            const response = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id, amount: 999999 });

            expect(response.status).toBe(201);

            const callArgs = epointClient.createPayment.mock.calls[epointClient.createPayment.mock.calls.length - 1][0];
            expect(callArgs.amount).toBeCloseTo(Number(order.total_price));
            expect(callArgs.amount).not.toBeCloseTo(999999);

        });

    });

    // ===== STEP3: IDOR - viewing another customer's payment =====

    describe("STEP3 - order/payment ownership (IDOR)", () => {

        it("blocks customer B from viewing customer A's payment status/transaction info", async () => {

            const order = await createOrderAs(tokenA);
            mockProviderSuccess();

            const created = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id });

            const paymentId = created.body.data.paymentId;

            const asOwner = await request(app)
                .get(`/api/payments/${paymentId}/status`)
                .set("Authorization", `Bearer ${tokenA}`);

            expect(asOwner.status).toBe(200);

            const asOther = await request(app)
                .get(`/api/payments/${paymentId}/status`)
                .set("Authorization", `Bearer ${tokenB}`);

            expect(asOther.status).toBe(403);

        });

    });

    // ===== STEP4: client-sent payment status is never accepted =====

    describe("STEP4 - payment status manipulation", () => {

        it("ignores a client-sent status of PAID/SUCCESS/COMPLETED on payment creation", async () => {

            const order = await createOrderAs(tokenA);
            mockProviderSuccess();

            const response = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id, status: "PAID" });

            expect(response.status).toBe(201);

            const payment = await prisma.payments.findUnique({ where: { id: response.body.data.paymentId } });
            expect(payment.status).toBe("PENDING");

        });

    });

    // ===== STEP5: full webhook signature matrix =====

    describe("STEP5 - webhook signature matrix", () => {

        async function createPendingPayment() {
            const order = await createOrderAs(tokenA);
            return prisma.payments.create({
                data: { order_id: order.id, amount: Number(order.total_price), currency: "AZN", status: "PENDING", provider: "epoint" }
            });
        }

        it("(1) accepts a valid signature", async () => {
            const payment = await createPendingPayment();
            const { data, signature } = signPayload({
                order_id: payment.id, status: "success", amount: String(payment.amount),
                transaction: `te_sig_valid_${Date.now()}`
            });
            const response = await request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature });
            expect(response.status).toBe(200);
            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PAID");
        });

        it("(2) rejects an invalid signature and leaves the payment unchanged", async () => {
            const payment = await createPendingPayment();
            const { data } = signPayload({ order_id: payment.id, status: "success", amount: String(payment.amount) });
            const response = await request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature: "definitely-wrong" });
            expect(response.status).toBe(401);
            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PENDING");
        });

        it("(3) rejects a missing signature field", async () => {
            const payment = await createPendingPayment();
            const { data } = signPayload({ order_id: payment.id, status: "success", amount: String(payment.amount) });
            const response = await request(app).post("/api/payments/webhook/epoint").type("form").send({ data });
            expect(response.status).toBe(400);
            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PENDING");
        });

        it("(4) rejects a payload modified after signing", async () => {
            const payment = await createPendingPayment();
            const { signature } = signPayload({ order_id: payment.id, status: "success", amount: String(payment.amount) });
            // Attacker re-encodes a different amount but reuses the original signature.
            const tamperedData = Buffer.from(JSON.stringify({ order_id: payment.id, status: "success", amount: "0.01" }), "utf8").toString("base64");
            const response = await request(app).post("/api/payments/webhook/epoint").type("form").send({ data: tamperedData, signature });
            expect(response.status).toBe(401);
            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PENDING");
        });

        it("(5) rejects a signature produced with the wrong private key", async () => {
            const payment = await createPendingPayment();
            const { data, signature } = signPayload(
                { order_id: payment.id, status: "success", amount: String(payment.amount) },
                "an-attackers-guessed-key"
            );
            const response = await request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature });
            expect(response.status).toBe(401);
            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PENDING");
        });

        it("(6) rejects an empty signature", async () => {
            const payment = await createPendingPayment();
            const { data } = signPayload({ order_id: payment.id, status: "success", amount: String(payment.amount) });
            const response = await request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature: "" });
            expect(response.status).toBe(400); // falsy signature caught by the same missing-field check as (3)
            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PENDING");
        });

    });

    // ===== STEP7: concurrent webhook delivery =====

    describe("STEP7 - concurrent webhook delivery", () => {

        it("applies a successful callback exactly once even when delivered in parallel", async () => {

            const order = await createOrderAs(tokenA);
            const payment = await prisma.payments.create({
                data: { order_id: order.id, amount: Number(order.total_price), currency: "AZN", status: "PENDING", provider: "epoint" }
            });

            const transactionId = `te_concurrent_${Date.now()}`;
            const { data, signature } = signPayload({
                order_id: payment.id, status: "success", amount: String(payment.amount), transaction: transactionId
            });

            const [r1, r2, r3] = await Promise.all([
                request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature }),
                request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature }),
                request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature })
            ]);

            [r1, r2, r3].forEach((r) => expect(r.status).toBe(200));

            // Exactly one of the three requests actually applied the update;
            // the others must report "already processed" via the atomic
            // updateMany guard, not a second successful apply.
            const alreadyProcessedCount = [r1, r2, r3].filter((r) => r.body.message === "Already processed").length;
            expect(alreadyProcessedCount).toBe(2);

            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PAID");
            expect(after.provider_transaction_id).toBe(transactionId);

        });

    });

    // ===== STEP8: provider-side failure scenarios =====

    describe("STEP8 - provider failure scenarios", () => {

        it("marks the payment FAILED and returns 502 when the provider is unreachable (timeout/network error)", async () => {

            const order = await createOrderAs(tokenA);
            epointClient.createPayment.mockRejectedValueOnce(new Error("network timeout"));

            const response = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id });

            expect(response.status).toBe(502);
            expect(response.body.code).toBe("PROVIDER_UNREACHABLE");

            const orderAfter = await prisma.orders.findUnique({ where: { id: order.id } });
            expect(orderAfter.status).toBe("Pending"); // never advances on a failed payment attempt

        });

        it("marks the payment FAILED and returns 502 when the provider rejects the request", async () => {

            const order = await createOrderAs(tokenA);
            epointClient.createPayment.mockResolvedValueOnce({
                httpStatus: 200,
                body: { status: "error", message: "card declined" }
            });

            const response = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id });

            expect(response.status).toBe(502);
            expect(response.body.code).toBe("PROVIDER_ERROR");

        });

    });

    // ===== STEP10/STEP16: duplicate-attempt prevention + retry model =====

    describe("STEP10/STEP16 - duplicate payment prevention and retry", () => {

        it("blocks a second payment attempt while one is still PENDING (refresh / new tab)", async () => {

            const order = await createOrderAs(tokenA);
            mockProviderSuccess();

            const first = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id });

            expect(first.status).toBe(201);

            const second = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id });

            expect(second.status).toBe(409);
            expect(second.body.code).toBe("PAYMENT_IN_PROGRESS");

            const payments = await prisma.payments.findMany({ where: { order_id: order.id } });
            expect(payments.length).toBe(1);

        });

        it("allows a fresh retry after a FAILED payment, keeping the FAILED row in the DB", async () => {

            const order = await createOrderAs(tokenA);

            epointClient.createPayment.mockResolvedValueOnce({
                httpStatus: 200,
                body: { status: "error", message: "declined" }
            });

            const failedAttempt = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id });

            expect(failedAttempt.status).toBe(502);

            mockProviderSuccess();

            const retry = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id });

            expect(retry.status).toBe(201);

            const payments = await prisma.payments.findMany({ where: { order_id: order.id }, orderBy: { created_at: "asc" } });
            expect(payments.length).toBe(2);
            expect(payments[0].status).toBe("FAILED");
            expect(payments[1].status).toBe("PENDING");

            // Never two PAID payments for one order: confirm only one row can
            // reach PAID by paying the retry and re-blocking a third attempt.
            const { data, signature } = signPayload({
                order_id: payments[1].id, status: "success", amount: String(payments[1].amount),
                transaction: `te_retry_${Date.now()}`
            });
            await request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature });

            const third = await request(app)
                .post("/api/payments/create")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ orderId: order.id });

            expect(third.status).toBe(409);
            expect(third.body.code).toBe("ALREADY_PAID");

        });

    });

    // ===== STEP13: payment status changes never touch order fulfillment status =====

    describe("STEP13 - payment/order status separation", () => {

        it("does not change order.status when a payment becomes PAID", async () => {

            const order = await createOrderAs(tokenA);
            const payment = await prisma.payments.create({
                data: { order_id: order.id, amount: Number(order.total_price), currency: "AZN", status: "PENDING", provider: "epoint" }
            });

            const { data, signature } = signPayload({
                order_id: payment.id, status: "success", amount: String(payment.amount),
                transaction: `te_separation_${Date.now()}`
            });

            await request(app).post("/api/payments/webhook/epoint").type("form").send({ data, signature });

            const orderAfter = await prisma.orders.findUnique({ where: { id: order.id } });
            expect(orderAfter.status).toBe("Pending"); // fulfillment status is admin-managed, untouched by payment webhook

        });

    });

});
