const { resolveOrderItems, resolveDelivery, resolveDiscount } = require("../utils/orderPricing");

// =======================
// VALIDATE PROMO CODE / GIFT CARD (dry-run, no mutation)
// =======================
//
// Client sends only a code + cart context (item ids/quantities, delivery
// method). It must never send a discount amount, remaining balance, or
// total - every one of those is resolved here from trusted server data so
// the same code always produces the same server-computed result regardless
// of what the client claims.

exports.validate = async (req, res) => {

    try {

        const { code, kind, items, delivery_method } = req.body;

        if (kind !== "promo" && kind !== "giftcard") {

            return res.status(400).json({
                success: false,
                code: "INVALID_KIND",
                message: "kind must be 'promo' or 'giftcard'"
            });

        }

        const itemsResult = await resolveOrderItems(items, req.user.id);

        if (itemsResult.error) {
            return res.status(itemsResult.error.status).json({
                success: false,
                code: "INVALID_ITEMS",
                message: itemsResult.error.message
            });
        }

        const { resolvedDeliveryMethod, deliveryFee } = resolveDelivery(delivery_method);

        if (deliveryFee === null) {

            return res.status(400).json({
                success: false,
                code: "INVALID_DELIVERY_METHOD",
                message: `Unknown delivery method: ${resolvedDeliveryMethod}`
            });

        }

        const result = await resolveDiscount({
            code,
            kind,
            itemsTotal: itemsResult.itemsTotal,
            deliveryFee
        });

        if (result.error) {

            return res.status(400).json({
                success: false,
                code: result.error.code,
                message: result.error.message,
                ...(result.error.minOrderAmount !== undefined
                    ? { minOrderAmount: result.error.minOrderAmount }
                    : {})
            });

        }

        res.json({

            success: true,

            data: {
                kind: result.kind,
                code: result.code,
                discountAmount: result.discountAmount,
                ...(result.kind === "giftcard"
                    ? { remainingBalance: result.remainingBalance, fullyCovered: result.fullyCovered }
                    : {})
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
