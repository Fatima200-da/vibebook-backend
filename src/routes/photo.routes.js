const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const photoController = require("../controllers/photo.controller");

/**
 * @swagger
 * tags:
 *   name: Photos
 *   description: Photo APIs
 */

/**
 * @swagger
 * /api/editor/pages/{id}/photos:
 *   post:
 *     summary: Add photo
 *     tags: [Photos]
 */
router.post(
    "/pages/:id/photos",
    auth,
    photoController.addPhoto
);

/**
 * @swagger
 * /api/editor/photos/{id}:
 *   put:
 *     summary: Update photo
 *     tags: [Photos]
 */
router.put(
    "/photos/:id",
    auth,
    photoController.updatePhoto
);

/**
 * @swagger
 * /api/editor/photos/{id}:
 *   delete:
 *     summary: Delete photo
 *     tags: [Photos]
 */
router.delete(
    "/photos/:id",
    auth,
    photoController.deletePhoto
);

module.exports = router;