const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const controller = require("../controllers/editor.controller");

/**
 * @swagger
 * tags:
 *   name: Editor
 *   description: Album Editor APIs
 */

/**
 * @swagger
 * /api/editor/albums/{id}:
 *   get:
 *     summary: Get album editor
 *     tags: [Editor]
 */
router.get(
    "/albums/:id",
    auth,
    controller.getAlbum
);

/**
 * @swagger
 * /api/editor/albums/{id}/pages:
 *   post:
 *     summary: Create page
 *     tags: [Editor]
 */
router.post(
    "/albums/:id/pages",
    auth,
    controller.createPage
);

/**
 * @swagger
 * /api/editor/pages/{id}:
 *   delete:
 *     summary: Delete page
 *     tags: [Editor]
 */
router.delete(
    "/pages/:id",
    auth,
    controller.deletePage
);

module.exports = router;