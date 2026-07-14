const express = require("express");

const router = express.Router();


const coverController = require("../controllers/cover.controller");

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const validate = require("../middleware/validation.middleware");



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
    validate(),
    coverController.getCoverById
);




// =======================
// CREATE COVER
// =======================

router.post(
    "/",
    auth,
    admin,
    validate(
        [
            "name",
            "price"
        ],
        {
            minLength:{
                name:3
            }
        }
    ),
    coverController.createCover
);




// =======================
// UPDATE COVER
// =======================

router.put(
    "/:id",
    auth,
    admin,
    validate(
        [
            "name",
            "price"
        ],
        {
            minLength:{
                name:3
            }
        }
    ),
    coverController.updateCover
);




// =======================
// DELETE COVER
// =======================

router.delete(
    "/:id",
    auth,
    admin,
    validate(),
    coverController.deleteCover
);



module.exports = router;