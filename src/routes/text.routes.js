const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const textController = require("../controllers/text.controller");

/**
 * @swagger
 * tags:
 *   name: Text
 *   description: Text Layer APIs
 */

/**
 * @swagger
 * /api/editor/pages/{id}/texts:
 *   post:
 *     summary: Add text
 *     tags: [Text]
 */
router.post(
    "/pages/:id/texts",
    auth,
    textController.addText
);

/**
 * @swagger
 * /api/editor/texts/{id}:
 *   put:
 *     summary: Update text
 *     tags: [Text]
 */
router.put(
    "/texts/:id",
    auth,
    textController.updateText
);

/**
 * @swagger
 * /api/editor/texts/{id}:
 *   delete:
 *     summary: Delete text
 *     tags: [Text]
 */
router.delete(
    "/texts/:id",
    auth,
    textController.deleteText
);

module.exports = router;