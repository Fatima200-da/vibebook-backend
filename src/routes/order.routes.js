const express = require("express");

const router = express.Router();

const validate = require("../middleware/validation.middleware");
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const controller = require("../controllers/order.controller");


/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order Management APIs
 */


/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Order list
 */
router.get(
    "/",
    auth,
    admin,
    controller.getOrders
);


/**
 * @swagger
 * /api/admin/orders/search:
 *   get:
 *     summary: Search orders
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
    admin,
    controller.searchOrders
);


/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 */
router.get(
    "/:id",
    auth,
    admin,
    controller.getOrderById
);


/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put(
    "/:id/status",
    auth,
    admin,
    validate([
        "status"
    ]),
    controller.updateOrderStatus
);


/**
 * @swagger
 * /api/admin/orders/{id}:
 *   delete:
 *     summary: Delete order
 *     tags: [Orders]
 */
router.delete(
    "/:id",
    auth,
    admin,
    controller.deleteOrder
);


module.exports = router;