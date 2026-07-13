const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const controller = require("../controllers/upload.controller");


/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File Upload APIs
 */


/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload file
 *     description: Upload image or file to server
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       400:
 *         description: Bad request
 */
router.post(
    "/",
    auth,
    upload.single("image"),
    controller.uploadFile
);


module.exports = router;