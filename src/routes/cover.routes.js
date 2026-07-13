const express = require("express");

const router = express.Router();

const coverController = require("../controllers/cover.controller");

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");


// =======================
// GET ALL COVERS
// =======================

router.get(
    "/",
    auth,
    admin,
    coverController.getCovers
);


// =======================
// GET COVER BY ID
// =======================

router.get(
    "/:id",
    auth,
    admin,
    coverController.getCoverById
);


// =======================
// CREATE COVER
// =======================

router.post(
    "/",
    auth,
    admin,
    coverController.createCover
);


// =======================
// UPDATE COVER
// =======================

router.put(
    "/:id",
    auth,
    admin,
    coverController.updateCover
);


// =======================
// DELETE COVER
// =======================

router.delete(
    "/:id",
    auth,
    admin,
    coverController.deleteCover
);


module.exports = router;