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

// Render (like Heroku/Railway/Fly's built-in proxy) always sits exactly one
// reverse-proxy hop in front of this process and sets X-Forwarded-For on
// every request. Without telling Express to trust that one hop, two things
// break: req.ip resolves to Render's internal proxy IP (not the real
// client), and express-rate-limit refuses to start up correctly, throwing
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR because it sees a forwarded-for header
// it was never told to trust.
//
// `1` (not `true`) is deliberate: `true` trusts an unlimited chain of
// proxies, which means a malicious client could set its own X-Forwarded-For
// and impersonate any IP, defeating IP-based rate limiting entirely. `1`
// trusts exactly Render's own edge proxy and nothing beyond it, matching
// the real, single-hop topology - a client-supplied X-Forwarded-For is
// still ignored beyond that one trusted hop.
app.set("trust proxy", 1);

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

    // Render's own platform health check polls GET /api/health on a short,
    // fixed interval, from Render's infrastructure rather than a real
    // client - sharing the general 100-req/15min budget with real traffic
    // meant Render's own routine polling could (and did, in production)
    // exhaust the budget and make the health check start reporting 429,
    // which looks like the service is down when it isn't. Skipped here
    // rather than removing the limiter from /api/health entirely, so every
    // other route under /api stays exactly as protected as before.
    skip: (req) => req.path === "/health",

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