const express = require("express");

const router = express.Router();

const coverController = require("../controllers/cover.controller");

const auth = require("../middleware/auth.middleware");


// bütün coverlər
router.get(
    "/",
    coverController.getCovers
);


// bir cover
router.get(
    "/:id",
    coverController.getCoverById
);


// yarat
router.post(
    "/",
    auth,
    coverController.createCover
);


// update
router.put(
    "/:id",
    auth,
    coverController.updateCover
);


// delete
router.delete(
    "/:id",
    auth,
    coverController.deleteCover
);



module.exports = router;