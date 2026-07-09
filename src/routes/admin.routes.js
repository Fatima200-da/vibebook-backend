const express = require("express");

const router = express.Router();

const adminController = require("../controllers/admin.controller");
const auth = require("../middleware/auth.middleware");


// =======================
// ADMIN LOGIN
// =======================

router.post(
    "/login",
    adminController.login
);


// =======================
// ADMIN LOGOUT
// =======================

router.post(
    "/logout",
    auth,
    adminController.logout
);


// =======================
// ADMIN PROFILE
// =======================

router.get(
    "/profile",
    auth,
    adminController.profile
);


module.exports = router;