const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const validate = require("../middleware/validation.middleware");

const albumController = require("../controllers/album.controller");



/**
 * @swagger
 * tags:
 *   name: Albums
 *   description: Album APIs
 */



/**
 * @swagger
 * /api/albums:
 *   post:
 *     summary: Create album
 *     tags: [Albums]
 */
router.post(
    "/",
    auth,
    validate([
        "product_id",
        "title",
        "total_pages"
    ]),
    albumController.createAlbum
);



/**
 * @swagger
 * /api/albums/{id}/preview:
 *   get:
 *     summary: Preview album before export
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: Album preview
 */
router.get(
    "/:id/preview",
    auth,
    albumController.previewAlbum
);



/**
 * @swagger
 * /api/albums/{id}/duplicate:
 *   post:
 *     summary: Duplicate album
 *     tags: [Albums]
 */
router.post(
    "/:id/duplicate",
    auth,
    albumController.duplicateAlbum
);



/**
 * @swagger
 * /api/albums/{id}/undo:
 *   post:
 *     summary: Undo last action
 *     tags: [Albums]
 */
router.post(
    "/:id/undo",
    auth,
    albumController.undoAlbum
);



/**
 * @swagger
 * /api/albums/{id}/redo:
 *   post:
 *     summary: Redo last action
 *     tags: [Albums]
 */
router.post(
    "/:id/redo",
    auth,
    albumController.redoAlbum
);



/**
 * @swagger
 * /api/albums/{id}:
 *   get:
 *     summary: Get album by ID
 *     tags: [Albums]
 */
router.get(
    "/:id",
    auth,
    albumController.getAlbum
);



/**
 * @swagger
 * /api/albums/{id}:
 *   put:
 *     summary: Update album
 *     tags: [Albums]
 */
router.put(
    "/:id",
    auth,
    albumController.updateAlbum
);



/**
 * @swagger
 * /api/albums/{id}:
 *   delete:
 *     summary: Delete album
 *     tags: [Albums]
 */
router.delete(
    "/:id",
    auth,
    albumController.deleteAlbum
);



module.exports = router;