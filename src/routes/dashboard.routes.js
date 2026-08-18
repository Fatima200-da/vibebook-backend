const express = require("express");
const router = express.Router();

const { getDashboard } = require("../controllers/dashboard.controller");
const auth = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

router.get("/", auth, adminMiddleware, getDashboard);

module.exports = router;