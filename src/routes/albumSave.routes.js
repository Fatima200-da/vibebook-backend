const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const controller = require("../controllers/albumSave.controller");


// AUTOSAVE ALBUM

router.put(
    "/albums/:id/save",
    auth,
    controller.saveAlbum
);


module.exports = router;