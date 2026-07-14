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



// =======================
// CREATE ALBUM
// =======================

router.post(
    "/",
    auth,
    validate(
        [
            "product_id",
            "title",
            "total_pages"
        ],
        {
            minLength:{
                title:3
            }
        }
    ),
    albumController.createAlbum
);




// =======================
// PREVIEW ALBUM
// =======================

router.get(
    "/:id/preview",
    auth,
    validate(),
    albumController.previewAlbum
);




// =======================
// DUPLICATE ALBUM
// =======================

router.post(
    "/:id/duplicate",
    auth,
    validate(),
    albumController.duplicateAlbum
);




// =======================
// UNDO
// =======================

router.post(
    "/:id/undo",
    auth,
    validate(),
    albumController.undoAlbum
);




// =======================
// REDO
// =======================

router.post(
    "/:id/redo",
    auth,
    validate(),
    albumController.redoAlbum
);




// =======================
// GET ALBUM
// =======================

router.get(
    "/:id",
    auth,
    validate(),
    albumController.getAlbum
);




// =======================
// UPDATE ALBUM
// =======================

router.put(
    "/:id",
    auth,
    validate(
        [
            "title"
        ],
        {
            minLength:{
                title:3
            }
        }
    ),
    albumController.updateAlbum
);




// =======================
// DELETE ALBUM
// =======================

router.delete(
    "/:id",
    auth,
    validate(),
    albumController.deleteAlbum
);



module.exports = router;