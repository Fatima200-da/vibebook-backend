const express = require("express");

const app = express();

app.get("/", (req, res) => {
    res.send("VibeBook Backend Running");
});

module.exports = app;