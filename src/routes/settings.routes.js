const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const controller = require("../controllers/settings.controller");


// =======================
// GET SETTINGS
// =======================

router.get(
    "/",
    auth,
    controller.getSettings
);


// =======================
// UPDATE SETTINGS
// =======================

router.put(
    "/",
    auth,
    controller.updateSettings
);


module.exports = router;