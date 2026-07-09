const express = require("express");

const router = express.Router();

const templateController = require("../controllers/template.controller");

const auth = require("../middleware/auth.middleware");



// GET ALL
router.get(
    "/",
    templateController.getTemplates
);



// GET ONE
router.get(
    "/:id",
    templateController.getTemplateById
);



// CREATE
router.post(
    "/",
    auth,
    templateController.createTemplate
);



// UPDATE
router.put(
    "/:id",
    auth,
    templateController.updateTemplate
);



// DELETE
router.delete(
    "/:id",
    auth,
    templateController.deleteTemplate
);



module.exports = router;