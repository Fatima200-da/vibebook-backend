const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/promotion.controller");

/**
 * @swagger
 * tags:
 *   name: Promotions
 *   description: Promo code / gift card validation APIs
 */

router.post("/validate", auth, controller.validate);

module.exports = router;
