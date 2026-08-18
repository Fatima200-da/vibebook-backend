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

const publicProductRoutes = require("./routes/publicProduct.routes");
const publicCategoryRoutes = require("./routes/publicCategory.routes");
const publicTemplateRoutes = require("./routes/publicTemplate.routes");
const publicSettingsRoutes = require("./routes/publicSettings.routes");
const publicContactRoutes = require("./routes/publicContact.routes");
const customerOrderRoutes = require("./routes/customerOrder.routes");
const meRoutes = require("./routes/me.routes");
const addressRoutes = require("./routes/address.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const promotionRoutes = require("./routes/promotion.routes");
const paymentRoutes = require("./routes/payment.routes");
const reviewRoutes = require("./routes/review.routes");

const healthRoutes = require("./routes/health.routes");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const app = express();
// =======================
// SECURITY
// =======================

// contentSecurityPolicy is off: this is a pure JSON API (plus Swagger UI,
// which needs inline scripts CSP would block) - the browser-facing app is a
// separate origin and sets its own CSP. crossOriginResourcePolicy is off
// because the frontend loads uploaded images/covers directly via <img src>
// from this server's /uploads on a different origin/port; Helmet's default
// "same-origin" policy would silently break every one of those images.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, same-origin) - allow.
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const err = new Error("Not allowed by CORS");
      err.statusCode = 403;
      return callback(err);
    },
  })
);

app.use(compression());

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const limiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 100,

    standardHeaders: true,

    legacyHeaders: false,

    message: {

        success: false,

        message: "Too many requests. Please try again later."

    }

});

app.use("/api", limiter);

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

app.use(
    "/api/templates",
    templateRoutes
);

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

app.use("/api/public/products", publicProductRoutes);
app.use("/api/public/categories", publicCategoryRoutes);
app.use("/api/public/templates", publicTemplateRoutes);
app.use("/api/public/settings", publicSettingsRoutes);
app.use("/api/public/contact", publicContactRoutes);
app.use("/api/orders", customerOrderRoutes);
app.use("/api/me", meRoutes);
app.use("/api/me/addresses", addressRoutes);
app.use("/api/me/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/payments", paymentRoutes);

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
    console.log("404", req.method, req.originalUrl);
    res.status(404).json({ success: false, message: "Not found" });
});

// =======================
// ERROR HANDLER
// =======================

app.use(errorHandler);

module.exports = app;