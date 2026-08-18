const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/payment.controller");
const { paymentCreateLimiter } = require("../middleware/rateLimiters");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Real payment provider integration (Epoint)
 */

router.post("/create", auth, paymentCreateLimiter, controller.createPayment);
router.get("/:id/status", auth, controller.getPaymentStatus);

// Server-to-server callback from Epoint - no auth middleware (the provider
// is not a logged-in user), signature verification happens inside the
// controller and is the only thing that authenticates this request.
router.post("/webhook/epoint", controller.webhook);

module.exports = router;
