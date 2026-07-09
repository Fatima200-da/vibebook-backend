const prisma = require("../config/prisma");


// =======================
// GET ALL ORDERS
// =======================

exports.getOrders = async (req, res) => {

    try {

        const orders = await prisma.orders.findMany({

            include: {
                users: true,
                albums: true
            },

            orderBy: {
                created_at: "desc"
            }

        });

        res.json({

            success: true,
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
                users: true,
                albums: true
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