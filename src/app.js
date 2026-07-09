const express = require("express");
const path = require("path");

const app = express();

// =======================
// MIDDLEWARES
// =======================

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


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
        message: "VibeBook Backend Running 🚀"
    });

});


// =======================
// ROUTES
// =======================

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

const orderRoutes = require("./routes/order.routes");
const settingsRoutes = require("./routes/settings.routes");
const uploadRoutes = require("./routes/upload.routes");


// =======================
// ADMIN
// =======================

app.use("/api/admin", adminRoutes);


// =======================
// DASHBOARD
// =======================

app.use("/api/admin/dashboard", dashboardRoutes);


// =======================
// AUTH
// =======================

app.use("/api/auth", authRoutes);


// =======================
// PRODUCTS
// =======================

app.use("/api/products", productRoutes);


// =======================
// CATEGORIES
// =======================

app.use("/api/categories", categoryRoutes);


// =======================
// COVERS
// =======================

app.use("/api/covers", coverRoutes);


// =======================
// TEMPLATES
// =======================

app.use("/api/templates", templateRoutes);


// =======================
// ALBUMS
// =======================

app.use("/api/albums", albumRoutes);


// =======================
// EDITOR
// =======================

app.use("/api/editor", editorRoutes);
app.use("/api/editor", photoRoutes);
app.use("/api/editor", textRoutes);


// =======================
// APPLY TEMPLATE
// =======================

app.use("/api", albumTemplateRoutes);


// =======================
// APPLY COVER
// =======================

app.use("/api", albumCoverRoutes);


// =======================
// AUTOSAVE
// =======================

app.use("/api", albumSaveRoutes);


// =======================
// ORDERS
// =======================

app.use("/api/admin/orders", orderRoutes);


// =======================
// SETTINGS
// =======================

app.use("/api/admin/settings", settingsRoutes);


// =======================
// UPLOAD
// =======================

app.use("/api/upload", uploadRoutes);


// =======================
// 404
// =======================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "Route not found"
    });

});


module.exports = app;