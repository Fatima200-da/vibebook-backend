const express = require("express");

const router = express.Router();

const albumController = require("../controllers/album.controller");
const auth = require("../middleware/auth.middleware");


// =======================
// CREATE ALBUM
// =======================

router.post(
    "/",
    auth,
    albumController.createAlbum
);


// =======================
// GET ALBUM
// =======================

router.get(
    "/:id",
    auth,
    albumController.getAlbum
);


// =======================
// UPDATE ALBUM
// =======================

router.put(
    "/:id",
    auth,
    albumController.updateAlbum
);


// =======================
// DELETE ALBUM
// =======================

router.delete(
    "/:id",
    auth,
    albumController.deleteAlbum
);


module.exports = router;