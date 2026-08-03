const express = require("express");

const router = express.Router();

const settingsController = require("../controllers/settings.controller");

/**
 * @swagger
 * tags:
 *   name: PublicSettings
 *   description: Public (no-auth) storefront settings (footer/contact info)
 */

router.get("/", settingsController.getSettings);
router.get("/contact", settingsController.getPublicContactInfo);

module.exports = router;
