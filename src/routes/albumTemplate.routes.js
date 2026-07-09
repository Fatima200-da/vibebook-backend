const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const controller = require("../controllers/albumTemplate.controller");


// APPLY TEMPLATE

router.post(
    "/albums/:id/template",
    auth,
    controller.applyTemplate
);


module.exports = router;