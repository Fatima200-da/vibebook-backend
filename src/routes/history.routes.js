const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const historyController = require("../controllers/history.controller");


/**
 * @swagger
 * tags:
 *   name: History
 *   description: Album Undo Redo APIs
 */


/**
 * @swagger
 * /api/albums/{albumId}/undo:
 *   post:
 *     summary: Undo last album action
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Album ID
 *     responses:
 *       200:
 *         description: Undo successful
 *       404:
 *         description: Album history not found
 */
router.post(
    "/albums/:albumId/undo",
    auth,
    historyController.undo
);


/**
 * @swagger
 * /api/albums/{albumId}/redo:
 *   post:
 *     summary: Redo last album action
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Album ID
 *     responses:
 *       200:
 *         description: Redo successful
 *       404:
 *         description: Album history not found
 */
router.post(
    "/albums/:albumId/redo",
    auth,
    historyController.redo
);


module.exports = router;