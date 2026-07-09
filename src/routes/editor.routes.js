const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const controller = require("../controllers/editor.controller");


// =======================
// GET ALBUM
// =======================

router.get(
    "/albums/:id",
    auth,
    controller.getAlbum
);


// =======================
// CREATE PAGE
// =======================

router.post(
    "/albums/:id/pages",
    auth,
    controller.createPage
);


// =======================
// DELETE PAGE
// =======================

router.delete(
    "/pages/:id",
    auth,
    controller.deletePage
);


module.exports = router;