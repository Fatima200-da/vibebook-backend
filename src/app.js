const express = require("express");
const path = require("path");

const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const errorHandler = require("./middleware/error.middleware");

const adminRoutes = require("./routes/admin.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const coverRoutes = require("./routes/cover.routes");
const templateRoutes = require("./routes/template.routes");
const albumRoutes = require("./routes/album.routes");

const editorRoutes = require("./routes/editor.routes");
const photoRoutes = require("./routes/photo.routes");
const textRoutes = require("./routes/text.routes");

const albumTemplateRoutes = require("./routes/albumTemplate.routes");
const albumCoverRoutes = require("./routes/albumCover.routes");
const albumSaveRoutes = require("./routes/albumSave.routes");

const historyRoutes = require("./routes/history.routes");

const orderRoutes = require("./routes/order.routes");
const settingsRoutes = require("./routes/settings.routes");
const uploadRoutes = require("./routes/upload.routes");
const userRoutes = require("./routes/user.routes");

const healthRoutes = require("./routes/health.routes");

const app = express();

// =======================
// MIDDLEWARES
// =======================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true,
    })
);

// =======================
// STATIC FILES
// =======================

app.use(
    "/uploads",
    express.static(path.join(__dirname, "../uploads"))
);

// =======================
// TEST ROUTE
// =======================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "VibeBook Backend Running 🚀",
    });
});

// =======================
// ROUTES
// =======================

app.use("/api/admin", adminRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/covers", coverRoutes);
app.use("/api/templates", templateRoutes);

app.use("/api/albums", albumRoutes);

app.use("/api/editor", editorRoutes);
app.use("/api/editor", photoRoutes);
app.use("/api/editor", textRoutes);

app.use("/api", albumTemplateRoutes);
app.use("/api", albumCoverRoutes);
app.use("/api", albumSaveRoutes);
app.use("/api", historyRoutes);

app.use("/api/admin/orders", orderRoutes);
app.use("/api/admin/settings", settingsRoutes);

app.use("/api/upload", uploadRoutes);

app.use("/api/users", userRoutes);

app.use("/api/health", healthRoutes);

// =======================
// SWAGGER
// =======================

app.use(
    "/api/docs",
    swaggerUI.serve,
    swaggerUI.setup(swaggerSpec)
);

// =======================
// 404
// =======================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// =======================
// ERROR HANDLER
// =======================

app.use(errorHandler);

module.exports = app;