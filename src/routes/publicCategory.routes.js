const express = require("express");

const router = express.Router();

const categoryController = require("../controllers/category.controller");

/**
 * @swagger
 * tags:
 *   name: PublicCategories
 *   description: Public (no-auth) category browsing APIs
 */

router.get("/", categoryController.getCategories);

module.exports = router;
