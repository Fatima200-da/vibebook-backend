const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const validate = require("../middleware/validation.middleware");

const controller = require("../controllers/template.controller");


// GET ALL TEMPLATES
router.get(
    "/",
    auth,
    admin,
    controller.getTemplates
);


// GET SINGLE TEMPLATE
router.get(
    "/:id",
    auth,
    admin,
    controller.getTemplateById
);


// CREATE TEMPLATE
router.post(
    "/",
    auth,
    admin,
    validate([
        "name"
    ]),
    controller.createTemplate
);


// UPDATE TEMPLATE
router.put(
    "/:id",
    auth,
    admin,
    controller.updateTemplate
);


// DELETE TEMPLATE
router.delete(
    "/:id",
    auth,
    admin,
    controller.deleteTemplate
);


// APPLY TEMPLATE
router.post(
    "/:id/apply",
    auth,
    admin,
    validate([
        "album_id"
    ]),
    controller.applyTemplate
);



module.exports = router;