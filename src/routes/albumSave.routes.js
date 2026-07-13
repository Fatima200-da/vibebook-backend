const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const validate = require("../middleware/validation.middleware");

const controller = require("../controllers/albumSave.controller");


/**
 * @swagger
 * tags:
 *   name: Album Save
 *   description: Album Autosave APIs
 */


/**
 * @swagger
 * /api/albums/{id}/save:
 *   put:
 *     summary: Save album changes
 *     tags: [Album Save]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Album ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: My Wedding Album
 *     responses:
 *       200:
 *         description: Album saved successfully
 *       400:
 *         description: Validation error
 */
router.put(
    "/albums/:id/save",
    auth,
    validate([
        "title"
    ]),
    controller.saveAlbum
);


module.exports = router;