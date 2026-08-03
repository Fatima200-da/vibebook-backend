const express = require("express");

const router = express.Router();

const reviewController = require("../controllers/review.controller");
const auth = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Product reviews - public read, auth-gated write scoped to the current user
 */

router.get("/product/:productId", reviewController.getProductReviews);
router.post("/:productId", auth, reviewController.createReview);
router.put("/:id", auth, reviewController.updateReview);
router.delete("/:id", auth, reviewController.deleteReview);

module.exports = router;
