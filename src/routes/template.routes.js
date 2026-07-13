const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const controller = require("../controllers/template.controller");


/**
 * @swagger
 * tags:
 *   name: Templates
 *   description: Template Management APIs
 */


/**
 * @swagger
 * /api/templates/{id}/apply:
 *   post:
 *     summary: Apply template to album
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               album_id:
 *                 type: string
 *                 example: ac2123f3-6ad5-4739-8920-0e7bc86dbf5c
 *
 *     responses:
 *       200:
 *         description: Template applied successfully
 *
 *       404:
 *         description: Template or album not found
 *
 */
router.post(
    "/:id/apply",
    auth,
    controller.applyTemplate
);


module.exports = router;