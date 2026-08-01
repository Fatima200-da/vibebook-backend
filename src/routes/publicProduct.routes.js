const express = require("express");

const router = express.Router();

const productController = require("../controllers/product.controller");

/**
 * @swagger
 * tags:
 *   name: PublicProducts
 *   description: Public (no-auth) product browsing APIs
 */

router.get("/", productController.searchProducts);
router.get("/:id", productController.getProduct);

module.exports = router;
