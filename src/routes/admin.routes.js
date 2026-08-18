const express = require("express");

const router = express.Router();

const adminController = require("../controllers/admin.controller");
const auth = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");


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
    adminMiddleware,
    adminController.logout
);


// =======================
// ADMIN PROFILE
// =======================

router.get(
    "/profile",
    auth,
    adminMiddleware,
    adminController.profile
);


module.exports = router;