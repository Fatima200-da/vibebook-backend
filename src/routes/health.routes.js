const express = require("express");

const router = express.Router();

const prisma = require("../config/prisma");

router.get("/", async (req, res) => {

    try {

        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({

            status: "ok",
            success: true,
            message: "VibeBook API is running.",
            database: "connected",

            timestamp: new Date()

        });

    } catch (err) {

        console.log("Health check: database unreachable -", err.message);

        res.status(503).json({

            status: "error",
            success: false,
            message: "Database unreachable",
            database: "disconnected",

            timestamp: new Date()

        });

    }

});

module.exports = router;
