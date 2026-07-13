const express = require("express");

const router = express.Router();

const admin = require("../middleware/admin.middleware");
const auth = require("../middleware/auth.middleware");
const validate = require("../middleware/validation.middleware");

const productController = require("../controllers/product.controller");


/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product Management APIs
 */


/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Products list
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/",
    auth,
    admin,
    productController.getProducts
);


/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: priceFrom
 *         schema:
 *           type: number
 *       - in: query
 *         name: priceTo
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
    "/search",
    auth,
    productController.searchProducts
);


/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by id
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/:id",
    auth,
    admin,
    productController.getProduct
);


/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/",
    auth,
    admin,
    validate([
        "category_id",
        "title",
        "price"
    ]),
    productController.createProduct
);


/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.put(
    "/:id",
    auth,
    admin,
    productController.updateProduct
);


/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    "/:id",
    auth,
    admin,
    productController.deleteProduct
);


module.exports = router;