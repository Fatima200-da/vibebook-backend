const prisma = require("../config/prisma");

// =======================
// GET MY WISHLIST
// =======================

exports.getMyWishlist = async (req, res) => {

    try {

        const items = await prisma.wishlist_items.findMany({
            where: {
                user_id: req.user.id,
                products: { is_deleted: false }
            },
            include: {
                products: {
                    include: { categories: true }
                }
            },
            orderBy: { created_at: "desc" }
        });

        res.json({
            success: true,
            data: items
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
// ADD TO WISHLIST
// =======================

exports.addToWishlist = async (req, res) => {

    try {

        const { productId } = req.params;

        const product = await prisma.products.findFirst({
            where: { id: productId, is_deleted: false }
        });

        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        const existing = await prisma.wishlist_items.findUnique({
            where: {
                user_id_product_id: {
                    user_id: req.user.id,
                    product_id: productId
                }
            }
        });

        if (existing) {

            return res.status(200).json({
                success: true,
                data: existing
            });

        }

        const item = await prisma.wishlist_items.create({
            data: {
                user_id: req.user.id,
                product_id: productId
            },
            include: {
                products: {
                    include: { categories: true }
                }
            }
        });

        res.status(201).json({
            success: true,
            data: item
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
// REMOVE FROM WISHLIST
// =======================

exports.removeFromWishlist = async (req, res) => {

    try {

        const { productId } = req.params;

        await prisma.wishlist_items.deleteMany({
            where: {
                user_id: req.user.id,
                product_id: productId
            }
        });

        res.json({
            success: true,
            message: "Removed from wishlist"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
