const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const controller = require("../controllers/albumCover.controller");


// APPLY COVER

router.post(
    "/albums/:id/cover",
    auth,
    controller.applyCover
);


module.exports = router;