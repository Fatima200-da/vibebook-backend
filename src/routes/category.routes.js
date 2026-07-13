const express = require("express");

const router = express.Router();

const validate = require("../middleware/validation.middleware");
const categoryController = require("../controllers/category.controller");
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category Management APIs
 */


/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category list
 */
router.get(
    "/",
    auth,
    admin,
    categoryController.getCategories
);


/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category found
 */
router.get(
    "/:id",
    auth,
    admin,
    categoryController.getCategory
);


/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Classic
 *     responses:
 *       201:
 *         description: Category created
 */
router.post(
    "/",
    auth,
    admin,
    validate([
        "name"
    ]),
    categoryController.createCategory
);


/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
 */
router.put(
    "/:id",
    auth,
    admin,
    categoryController.updateCategory
);


/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Categories]
 */
router.delete(
    "/:id",
    auth,
    admin,
    categoryController.deleteCategory
);


module.exports = router;