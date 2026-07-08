const express = require("express");
const path = require("path");

const adminRoutes = require("./routes/admin.routes");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.get("/", (req, res) => {
  res.send("VibeBook Backend Running");
});

app.use("/api/admin", adminRoutes);

module.exports = app;