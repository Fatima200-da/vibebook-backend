const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/order.controller");

router.get("/", auth, controller.getOrders);

router.get("/:id", auth, controller.getOrderById);

router.put("/:id/status", auth, controller.updateOrderStatus);

router.delete("/:id", auth, controller.deleteOrder);

module.exports = router;