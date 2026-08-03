const express = require("express");

const router = express.Router();

const wishlistController = require("../controllers/wishlist.controller");
const auth = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Wishlist
 *   description: Customer favorite products (auth required, always scoped to the current user)
 */

router.get("/", auth, wishlistController.getMyWishlist);
router.post("/:productId", auth, wishlistController.addToWishlist);
router.delete("/:productId", auth, wishlistController.removeFromWishlist);

module.exports = router;
