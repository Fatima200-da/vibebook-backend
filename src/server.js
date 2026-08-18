require("dotenv").config();

// Production must fail loudly at boot if a required var is missing, rather
// than starting "successfully" and only surfacing the gap on the first
// request that needs it (e.g. CORS_ORIGIN unset previously meant every
// origin was silently allowed once NODE_ENV=production, since app.js's
// whitelist check treats an empty list as "no restriction"). Dev/test stay
// unaffected - this check only runs in production. Never log the actual
// values, only which names are missing.
if (process.env.NODE_ENV === "production") {

    const required = ["DATABASE_URL", "JWT_SECRET", "CORS_ORIGIN"];
    const missing = required.filter((name) => !process.env[name]);

    if (missing.length > 0) {
        console.error(`FATAL: missing required environment variable(s): ${missing.join(", ")}`);
        process.exit(1);
    }

}

const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});