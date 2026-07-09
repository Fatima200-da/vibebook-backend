const express = require("express");

const router = express.Router();

const textController = require("../controllers/text.controller");

const auth = require("../middleware/auth.middleware");


// =======================
// ADD TEXT
// =======================

router.post(
    "/pages/:id/text",
    auth,
    textController.addText
);


// =======================
// UPDATE TEXT
// =======================

router.put(
    "/text/:id",
    auth,
    textController.updateText
);


// =======================
// DELETE TEXT
// =======================

router.delete(
    "/text/:id",
    auth,
    textController.deleteText
);


module.exports = router