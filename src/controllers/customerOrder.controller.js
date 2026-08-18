const prisma = require("../config/prisma");
const {
    resolveOrderItems,
    resolveDelivery,
    resolveDiscount,
    applyDiscountUsage
} = require("../utils/orderPricing");

// =======================
// CREATE ORDER (customer checkout)
// =======================

exports.createOrder = async (req, res) => {

    try {

        const {
            items,
            shipping_name,
            shipping_phone,
            shipping_address,
            delivery_method,
            discount_code,
            discount_kind
        } = req.body;

        // Price and title are never trusted from the client - always resolved
        // server-side from the real product (and album, if the item is a
        // designed album) so a tampered request body cannot under-price an order.
        const itemsResult = await resolveOrderItems(items, req.user.id);

        if (itemsResult.error) {
            return res.status(itemsResult.error.status).json({
                success: false,
                message: itemsResult.error.message
            });
        }

        const { resolvedItems, itemsTotal } = itemsResult;

        // Delivery fee is never trusted from the client - only the method key
        // is accepted, and the fee is looked up server-side from a fixed config.
        const { resolvedDeliveryMethod, deliveryFee } = resolveDelivery(delivery_method);

        if (deliveryFee === null) {

            return res.status(400).json({

                success: false,
                message: `Unknown delivery method: ${resolvedDeliveryMethod}`

            });

        }

        const kind = discount_kind === "giftcard" ? "giftcard" : "promo";

        // Discount validation + atomic usage/balance consumption happen inside
        // the same transaction as order creation, so a discount code can never
        // be marked used (or a gift card balance decremented) unless the order
        // it belongs to actually gets created - and vice versa, a failed
        // usage/balance update (lost a concurrency race) rolls the whole order
        // creation back rather than creating an under-priced order.
        const order = await prisma.$transaction(async (tx) => {

            let discount = null;

            if (discount_code) {

                const discountResult = await resolveDiscount({
                    code: discount_code,
                    kind,
                    itemsTotal,
                    deliveryFee,
                    client: tx
                });

                if (discountResult.error) {
                    const err = new Error(discountResult.error.message);
                    err.code = discountResult.error.code;
                    err.httpStatus = 400;
                    throw err;
                }

                discount = discountResult;

                const applied = await applyDiscountUsage(discount, tx);

                if (!applied) {
                    const err = new Error("Discount code is no longer available");
                    err.code = "DISCOUNT_UNAVAILABLE";
                    err.httpStatus = 409;
                    throw err;
                }

            }

            const discountAmount = discount ? discount.discountAmount : 0;
            const total_price = Math.max(itemsTotal + deliveryFee - discountAmount, 0);

            return tx.orders.create({

                data: {

                    user_id: req.user.id,
                    status: "Pending",
                    total_price,
                    delivery_method: resolvedDeliveryMethod,
                    delivery_fee: deliveryFee,
                    discount_code: discount ? discount.code : null,
                    discount_kind: discount ? discount.kind : null,
                    discount_amount: discountAmount,
                    shipping_name: shipping_name || null,
                    shipping_phone: shipping_phone || null,
                    shipping_address: shipping_address || null,

                    order_items: {
                        create: resolvedItems
                    }

                },

                include: {
                    order_items: true
                }

            });

        });

        res.status(201).json({

            success: true,
            data: order

        });

    } catch (err) {

        console.log(err);

        if (err.httpStatus) {

            return res.status(err.httpStatus).json({

                success: false,
                code: err.code,
                message: err.message

            });

        }

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};


// =======================
// GET MY ORDERS
// =======================

exports.getMyOrders = async (req, res) => {

    try {

        let {
            page = 1,
            limit = 20
        } = req.query;

        page = Number(page);
        limit = Number(limit);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        const where = {
            user_id: req.user.id
        };

        const total = await prisma.orders.count({ where });

        const orders = await prisma.orders.findMany({

            where,

            include: {
                order_items: {
                    include: {
                        products: true,
                        albums: true
                    }
                }
            },

            orderBy: {
                created_at: "desc"
            },

            skip: (page - 1) * limit,
            take: limit

        });

        res.json({

            success: true,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            data: orders

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
// GET MY ORDER BY ID
// =======================

exports.getMyOrder = async (req, res) => {

    try {

        const order = await prisma.orders.findUnique({

            where: {
                id: req.params.id
            },

            include: {
                order_items: {
                    include: {
                        products: true,
                        albums: {
                            include: {
                                products: true,
                                templates: true
                            }
                        }
                    }
                }
            }

        });

        if (!order) {

            return res.status(404).json({

                success: false,
                message: "Order not found"

            });

        }

        if (order.user_id !== req.user.id) {

            return res.status(403).json({

                success: false,
                message: "Access denied"

            });

        }

        res.json({

            success: true,
            data: order

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};
