const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/me.controller");

/**
 * @swagger
 * tags:
 *   name: Me
 *   description: Customer self-service profile APIs
 */

router.get("/", auth, controller.getMe);
router.put("/", auth, controller.updateMe);

module.exports = router;
