const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const upload = require("../middleware/upload.middleware");

const controller = require("../controllers/upload.controller");


// =======================
// UPLOAD IMAGE
// =======================

router.post(

    "/",

    auth,

    upload.single("image"),

    controller.uploadFile

);


module.exports = router;