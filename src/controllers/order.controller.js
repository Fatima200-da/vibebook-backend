const prisma = require("../config/prisma");


// =======================
// GET ALL ORDERS
// =======================

exports.getOrders = async (req, res) => {

    try {

        const {
            page = 1,
            limit = 20,
            status,
            sort = "newest"
        } = req.query;

        const where = {};

        if (status) {
            where.status = status;
        }

        const orderBy =
            sort === "oldest"
                ? { created_at: "asc" }
                : { created_at: "desc" };

        const total = await prisma.orders.count({
            where
        });

        const orders = await prisma.orders.findMany({

            where,

            include: {
                users: { select: { id: true, full_name: true, email: true } },
                payments: {
                    orderBy: { created_at: "desc" },
                    take: 1
                }
            },

            orderBy,

            skip: (Number(page) - 1) * Number(limit),

            take: Number(limit)

        });

        res.json({

            success: true,

            total,

            page: Number(page),

            limit: Number(limit),

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
// GET ORDER BY ID
// =======================

exports.getOrderById = async (req, res) => {

    try {

        const order = await prisma.orders.findUnique({

            where: {
                id: req.params.id
            },

            include: {
                users: { select: { id: true, full_name: true, email: true } },
                payments: {
                    orderBy: { created_at: "desc" }
                }
            }

        });

        if (!order) {

            return res.status(404).json({

                success: false,
                message: "Order tapılmadı"

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


// =======================
// UPDATE ORDER STATUS
// =======================

exports.updateOrderStatus = async (req, res) => {

    try {

        const { status } = req.body;

        const allowedStatus = [
            "Pending",
            "Preparing",
            "Printing",
            "Shipping",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatus.includes(status)) {

            return res.status(400).json({

                success: false,
                message: "Status düzgün deyil."

            });

        }

        const order = await prisma.orders.update({

            where: {
                id: req.params.id
            },

            data: {
                status
            }

        });

        res.json({

            success: true,
            message: "Order status yeniləndi",
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
// DELETE ORDER
// =======================

exports.deleteOrder = async (req, res) => {

    try {

        // order_items and payments both hold a RESTRICT foreign key back to
        // this order - a plain delete() throws a raw Postgres constraint
        // error for virtually every real order (every order created via
        // checkout has at least one item). Checked up front, same pattern
        // as deleteAlbum's order_items guard, so this is a clean 409
        // instead of a 500 leaking a database error.
        const [itemCount, paymentCount] = await Promise.all([
            prisma.order_items.count({ where: { order_id: req.params.id } }),
            prisma.payments.count({ where: { order_id: req.params.id } })
        ]);

        if (itemCount > 0 || paymentCount > 0) {

            return res.status(409).json({

                success: false,
                message: "Bu sifarişin məhsulları və ya ödəniş qeydləri var, silinə bilməz",
                code: "ORDER_HAS_RECORDS"

            });

        }

        await prisma.orders.delete({

            where: {
                id: req.params.id
            }

        });

        res.json({

            success: true,
            message: "Order silindi"

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
// SEARCH ORDERS
// =======================

exports.searchOrders = async (req, res) => {

    try {

        const {
            q,
            status,
            page = 1,
            limit = 20,
            sort = "newest"
        } = req.query;

        const where = {};

        if (q) {

            where.OR = [

                {
                    customer_name: {
                        contains: q,
                        mode: "insensitive"
                    }
                },

                {
                    customer_email: {
                        contains: q,
                        mode: "insensitive"
                    }
                },

                {
                    customer_phone: {
                        contains: q,
                        mode: "insensitive"
                    }
                }

            ];

        }

        if (status) {

            where.status = status;

        }

        const orderBy =
            sort === "oldest"
                ? { created_at: "asc" }
                : { created_at: "desc" };

        const orders = await prisma.orders.findMany({

            where,

            include: {

                users: { select: { id: true, full_name: true, email: true } }

            },

            orderBy,

            skip: (Number(page) - 1) * Number(limit),

            take: Number(limit)

        });

        const total = await prisma.orders.count({

            where

        });

        res.json({

            success: true,

            total,

            page: Number(page),

            limit: Number(limit),

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
// SEARCH ORDERS
// =======================

exports.searchOrders = async (req, res) => {

    try {

        const { q } = req.query;


        const orders = await prisma.orders.findMany({

            where: {

                status: q

            },

            include: {
                
                payments: true

            }

        });


        res.json({

            success: true,
            total: orders.length,
            data: orders

        });


    } catch (err) {

        console.log(err);

        res.status(500).json({

            success:false,
            message: err.message

        });

    }

};