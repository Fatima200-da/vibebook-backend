const prisma = require("../config/prisma");

// =======================
// GET PRODUCT REVIEWS (public)
// =======================

exports.getProductReviews = async (req, res) => {

    try {

        const { productId } = req.params;

        let { page = 1, limit = 5, sort = "newest" } = req.query;

        page = Math.max(1, parseInt(page) || 1);
        limit = Math.min(50, Math.max(1, parseInt(limit) || 5));

        const orderBy =
            sort === "highest" ? { rating: "desc" } :
            sort === "lowest" ? { rating: "asc" } :
            { created_at: "desc" };

        const [total, reviews, allRatings] = await Promise.all([

            prisma.reviews.count({ where: { product_id: productId } }),

            prisma.reviews.findMany({
                where: { product_id: productId },
                include: { users: { select: { id: true, full_name: true } } },
                orderBy,
                skip: (page - 1) * limit,
                take: limit
            }),

            prisma.reviews.findMany({
                where: { product_id: productId },
                select: { rating: true }
            })

        ]);

        const totalRatings = allRatings.length;

        const average = totalRatings === 0
            ? 0
            : allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        allRatings.forEach((r) => {
            breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
        });

        res.json({

            success: true,
            data: reviews,
            total,
            page,
            limit,
            pages: Math.max(1, Math.ceil(total / limit)),
            summary: {
                average,
                total: totalRatings,
                breakdown
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
// CREATE REVIEW
// =======================

exports.createReview = async (req, res) => {

    try {

        const { productId } = req.params;
        const { rating, title, comment } = req.body;

        const ratingNum = Number(rating);

        if (!ratingNum || ratingNum < 1 || ratingNum > 5) {

            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });

        }

        if (!comment || !comment.trim()) {

            return res.status(400).json({
                success: false,
                message: "Comment is required"
            });

        }

        const product = await prisma.products.findFirst({
            where: { id: productId, is_deleted: false }
        });

        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        const hasOrdered = await prisma.order_items.findFirst({
            where: {
                product_id: productId,
                orders: { user_id: req.user.id }
            }
        });

        if (!hasOrdered) {

            return res.status(403).json({
                success: false,
                message: "You can only review products you have ordered"
            });

        }

        const existing = await prisma.reviews.findUnique({
            where: {
                user_id_product_id: {
                    user_id: req.user.id,
                    product_id: productId
                }
            }
        });

        if (existing) {

            return res.status(409).json({
                success: false,
                message: "You have already reviewed this product"
            });

        }

        const review = await prisma.reviews.create({
            data: {
                user_id: req.user.id,
                product_id: productId,
                rating: ratingNum,
                title: title || null,
                comment
            },
            include: { users: { select: { id: true, full_name: true } } }
        });

        res.status(201).json({
            success: true,
            data: review
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
// UPDATE REVIEW
// =======================

exports.updateReview = async (req, res) => {

    try {

        const existing = await prisma.reviews.findUnique({
            where: { id: req.params.id }
        });

        if (!existing) {

            return res.status(404).json({
                success: false,
                message: "Review not found"
            });

        }

        if (existing.user_id !== req.user.id) {

            return res.status(403).json({
                success: false,
                message: "Access denied"
            });

        }

        const { rating, title, comment } = req.body;

        if (rating !== undefined) {

            const ratingNum = Number(rating);

            if (!ratingNum || ratingNum < 1 || ratingNum > 5) {

                return res.status(400).json({
                    success: false,
                    message: "Rating must be between 1 and 5"
                });

            }

        }

        const updated = await prisma.reviews.update({
            where: { id: existing.id },
            data: {
                rating: rating !== undefined ? Number(rating) : undefined,
                title: title !== undefined ? title : undefined,
                comment: comment !== undefined ? comment : undefined
            },
            include: { users: { select: { id: true, full_name: true } } }
        });

        res.json({
            success: true,
            data: updated
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
// DELETE REVIEW
// =======================

exports.deleteReview = async (req, res) => {

    try {

        const existing = await prisma.reviews.findUnique({
            where: { id: req.params.id }
        });

        if (!existing) {

            return res.status(404).json({
                success: false,
                message: "Review not found"
            });

        }

        if (existing.user_id !== req.user.id) {

            return res.status(403).json({
                success: false,
                message: "Access denied"
            });

        }

        await prisma.reviews.delete({
            where: { id: existing.id }
        });

        res.json({
            success: true,
            message: "Review deleted"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
