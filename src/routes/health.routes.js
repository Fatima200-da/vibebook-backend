const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {

    res.status(200).json({

        success: true,
        message: "VibeBook API is running.",

        timestamp: new Date()

    });

});

module.exports = router;