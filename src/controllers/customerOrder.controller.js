const prisma = require("../config/prisma");

// =======================
// CREATE ORDER (customer checkout)
// =======================

exports.createOrder = async (req, res) => {

    try {

        const {
            items,
            shipping_name,
            shipping_phone,
            shipping_address
        } = req.body;

        if (!Array.isArray(items) || items.length === 0) {

            return res.status(400).json({

                success: false,
                message: "items must be a non-empty array"

            });

        }

        for (const item of items) {

            if (!item.product_id || item.price === undefined || item.price === null) {

                return res.status(400).json({

                    success: false,
                    message: "Each item requires product_id and price"

                });

            }

            if (!item.quantity || Number(item.quantity) < 1) {

                return res.status(400).json({

                    success: false,
                    message: "Each item requires a quantity of at least 1"

                });

            }

        }

        const total_price = items.reduce(
            (sum, item) => sum + Number(item.price) * Number(item.quantity),
            0
        );

        const order = await prisma.orders.create({

            data: {

                user_id: req.user.id,
                status: "PENDING",
                total_price,
                shipping_name: shipping_name || null,
                shipping_phone: shipping_phone || null,
                shipping_address: shipping_address || null,

                order_items: {
                    create: items.map((item) => ({
                        product_id: item.product_id,
                        album_id: item.album_id || null,
                        title: item.title || "",
                        price: Number(item.price),
                        quantity: Number(item.quantity)
                    }))
                }

            },

            include: {
                order_items: true
            }

        });

        res.status(201).json({

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
                order_items: true
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
                        products: true
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
