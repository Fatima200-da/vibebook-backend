const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const controller = require("../controllers/settings.controller");


// =======================
// GET SETTINGS
// =======================

router.get(
    "/",
    auth,
    admin,
    controller.getSettings
);


// =======================
// UPDATE SETTINGS
// =======================

router.put(
    "/",
    auth,
    admin,
    controller.updateSettings
);


module.exports = router;