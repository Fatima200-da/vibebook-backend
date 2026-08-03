const express = require("express");

const router = express.Router();

const contactController = require("../controllers/contact.controller");

/**
 * @swagger
 * tags:
 *   name: PublicContact
 *   description: Public (no-auth) contact form submissions
 */

router.post("/", contactController.createContactMessage);

module.exports = router;
