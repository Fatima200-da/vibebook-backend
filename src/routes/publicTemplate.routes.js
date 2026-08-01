const express = require("express");

const router = express.Router();

const templateController = require("../controllers/template.controller");

/**
 * @swagger
 * tags:
 *   name: PublicTemplates
 *   description: Public (no-auth) template browsing APIs
 */

router.get("/", templateController.getTemplates);
router.get("/:id", templateController.getTemplateById);

module.exports = router;
