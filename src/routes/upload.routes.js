const express = require("express");
const multer = require("multer");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const { MAX_IMAGE_UPLOAD_BYTES } = require("../config/uploadLimits");

const controller = require("../controllers/upload.controller");

// Multer throws synchronously (LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE, etc.)
// and the fileFilter's own rejection also lands here via next(err) - both
// previously fell through to the generic error handler as a bare 500
// ("Internal Server Error"-shaped response for what is really a client
// mistake). Wrapping upload.single() lets us return the correct 4xx status
// with a clear, localized message instead (Phase 12 STEP1).
function handleUpload(req, res, next) {
    upload.single("image")(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            const maxMb = Math.round(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024));
            return res.status(413).json({
                success: false,
                message: `Şəkil maksimum ${maxMb} MB ola bilər.`,
            });
        }

        // The fileFilter's own rejection (wrong type/extension) - a client
        // validation error, not a server fault.
        return res.status(400).json({
            success: false,
            message: err.message || "Fayl yüklənə bilmədi.",
        });
    });
}


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
    handleUpload,
    controller.uploadFile
);


module.exports = router;