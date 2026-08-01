const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/customerOrder.controller");

/**
 * @swagger
 * tags:
 *   name: CustomerOrders
 *   description: Customer-facing order APIs
 */

router.post("/", auth, controller.createOrder);
router.get("/", auth, controller.getMyOrders);
router.get("/:id", auth, controller.getMyOrder);

module.exports = router;
