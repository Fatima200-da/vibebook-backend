const rateLimit = require("express-rate-limit");

// The blanket /api limiter (100 req/15min in app.js) is shared across every
// call a client makes, so a credential-stuffing or payment-spam attempt
// against one specific endpoint barely dents that shared budget. These are
// separate, per-endpoint, stricter limiters for the small set of routes
// where that actually matters: auth (brute force) and payment creation
// (spamming charge attempts). The webhook is intentionally NOT limited here
// - it's a server-to-server callback from the payment provider, which must
// be able to retry without being mistaken for abuse.

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Please try again later."
    }
});

const paymentCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many payment attempts. Please try again later."
    }
});

module.exports = { authLimiter, paymentCreateLimiter };
