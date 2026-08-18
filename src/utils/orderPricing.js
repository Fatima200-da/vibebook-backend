const prisma = require("../config/prisma");
const { DEFAULT_DELIVERY_METHOD, resolveDeliveryFee } = require("../config/deliveryMethods");

// Shared server-authoritative pricing helpers used by both the order-creation
// endpoint and the promotion-validation endpoint, so a discount preview shown
// at Checkout always matches exactly what order creation will actually charge.

// Resolves cart items against real DB prices - never trusts a client-sent
// price/title. Returns { error: { status, message } } or { resolvedItems, itemsTotal }.
// Accepts an optional `client` (a Prisma transaction client) so callers can
// run this inside the same transaction as a later write.
async function resolveOrderItems(items, userId, client = prisma) {

    if (!Array.isArray(items) || items.length === 0) {
        return { error: { status: 400, message: "items must be a non-empty array" } };
    }

    for (const item of items) {

        if (!item.product_id) {
            return { error: { status: 400, message: "Each item requires product_id" } };
        }

        if (!item.quantity || Number(item.quantity) < 1) {
            return { error: { status: 400, message: "Each item requires a quantity of at least 1" } };
        }

    }

    const resolvedItems = [];

    for (const item of items) {

        const product = await client.products.findUnique({
            where: { id: item.product_id }
        });

        if (!product || product.is_deleted) {
            return { error: { status: 400, message: `Product not found: ${item.product_id}` } };
        }

        let album = null;

        if (item.album_id) {

            album = await client.albums.findUnique({
                where: { id: item.album_id }
            });

            if (!album || album.user_id !== userId) {
                return { error: { status: 403, message: "Access denied to the album on one of the items" } };
            }

        }

        resolvedItems.push({
            product_id: product.id,
            album_id: album ? album.id : null,
            title: album ? album.title : product.title,
            price: Number(product.price),
            quantity: Number(item.quantity)
        });

    }

    const itemsTotal = resolvedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    return { resolvedItems, itemsTotal };

}

// Resolves the delivery fee from the fixed server config - never trusts a
// client-sent fee amount, only the method key. Returns deliveryFee: null if
// the method key is unknown.
function resolveDelivery(deliveryMethod) {
    const resolvedDeliveryMethod = deliveryMethod || DEFAULT_DELIVERY_METHOD;
    const deliveryFee = resolveDeliveryFee(resolvedDeliveryMethod);
    return { resolvedDeliveryMethod, deliveryFee };
}

function normalizeCode(code) {
    return typeof code === "string" ? code.trim().toUpperCase() : "";
}

// Validates and prices a promo code or gift card against server-trusted
// amounts. Does NOT mutate usage_count/remaining_balance - that only happens
// atomically at order creation (see customerOrder.controller.js), via a
// conditional UPDATE guarded against the same race this function protects
// against on the read side. Accepts an optional `client` (a Prisma
// transaction client) so order creation can validate+update inside one
// transaction. Returns { error: { code, message } } or the priced result.
async function resolveDiscount({ code, kind, itemsTotal, deliveryFee, client = prisma }) {

    const normalizedCode = normalizeCode(code);

    if (!normalizedCode) {
        return { error: { code: "INVALID_CODE", message: "Code is required" } };
    }

    if (kind === "promo") {

        const promo = await client.promo_codes.findUnique({ where: { code: normalizedCode } });

        if (!promo) {
            return { error: { code: "NOT_FOUND", message: "Promo code not found" } };
        }

        if (!promo.active) {
            return { error: { code: "INACTIVE", message: "Promo code is inactive" } };
        }

        if (promo.expires_at && promo.expires_at < new Date()) {
            return { error: { code: "EXPIRED", message: "Promo code has expired" } };
        }

        if (promo.usage_limit !== null && promo.used_count >= promo.usage_limit) {
            return { error: { code: "USAGE_LIMIT_REACHED", message: "Promo code usage limit reached" } };
        }

        if (promo.min_order_amount !== null && itemsTotal < Number(promo.min_order_amount)) {
            return {
                error: {
                    code: "MIN_ORDER_NOT_MET",
                    message: "Order does not meet the promo code's minimum amount",
                    minOrderAmount: Number(promo.min_order_amount)
                }
            };
        }

        const rawDiscount =
            promo.discount_type === "percentage"
                ? (itemsTotal * Number(promo.discount_value)) / 100
                : Number(promo.discount_value);

        const discountAmount = Math.min(rawDiscount, itemsTotal);

        return { kind: "promo", code: normalizedCode, record: promo, discountAmount };

    }

    if (kind === "giftcard") {

        const giftCard = await client.gift_cards.findUnique({ where: { code: normalizedCode } });

        if (!giftCard) {
            return { error: { code: "NOT_FOUND", message: "Gift card not found" } };
        }

        if (!giftCard.active) {
            return { error: { code: "INACTIVE", message: "Gift card is inactive" } };
        }

        if (giftCard.expires_at && giftCard.expires_at < new Date()) {
            return { error: { code: "EXPIRED", message: "Gift card has expired" } };
        }

        const remaining = Number(giftCard.remaining_balance);

        if (remaining <= 0) {
            return { error: { code: "DEPLETED", message: "Gift card balance is depleted" } };
        }

        const orderTotal = itemsTotal + deliveryFee;
        const discountAmount = Math.min(remaining, orderTotal);
        const remainingAfter = remaining - discountAmount;

        return {
            kind: "giftcard",
            code: normalizedCode,
            record: giftCard,
            discountAmount,
            remainingBalance: remainingAfter,
            fullyCovered: remaining >= orderTotal
        };

    }

    return { error: { code: "INVALID_KIND", message: "kind must be 'promo' or 'giftcard'" } };

}

// Atomically consumes a validated discount's usage/balance inside a
// transaction. The WHERE clause re-checks the same condition that made the
// discount valid, so if a concurrent request already consumed it (usage
// limit reached, or balance dropped below discountAmount), this affects 0
// rows and the caller must roll back the whole order - preventing
// double-spend under concurrent requests without needing a retry loop.
async function applyDiscountUsage(discount, client) {

    if (discount.kind === "promo") {

        const where = { id: discount.record.id };

        if (discount.record.usage_limit !== null) {
            where.used_count = { lt: discount.record.usage_limit };
        }

        const result = await client.promo_codes.updateMany({
            where,
            data: { used_count: { increment: 1 } }
        });

        return result.count > 0;

    }

    const result = await client.gift_cards.updateMany({
        where: {
            id: discount.record.id,
            remaining_balance: { gte: discount.discountAmount }
        },
        data: { remaining_balance: { decrement: discount.discountAmount } }
    });

    return result.count > 0;

}

module.exports = {
    resolveOrderItems,
    resolveDelivery,
    resolveDiscount,
    applyDiscountUsage,
    normalizeCode
};
