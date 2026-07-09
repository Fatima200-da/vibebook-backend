const express = require("express");

const router = express.Router();

const photoController = require("../controllers/photo.controller");

const auth = require("../middleware/auth.middleware");


// =======================
// ADD PHOTO
// =======================

router.post(
    "/pages/:id/photos",
    auth,
    photoController.addPhoto
);


// =======================
// UPDATE PHOTO
// =======================

router.put(
    "/photos/:id",
    auth,
    photoController.updatePhoto
);


// =======================
// DELETE PHOTO
// =======================

router.delete(
    "/photos/:id",
    auth,
    photoController.deletePhoto
);


module.exports = router;