const crypto = require("crypto");
const path = require("path");

// Only ever called on a filename that has already passed the extension
// whitelist in upload.middleware.js, but re-validated here too since this
// module has no dependency on that call order - a key generator that trusts
// its caller is how path-traversal/extension bugs sneak in later.
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// The storage key is a fresh random UUID - never the original filename and
// never derived from user input. This removes filename-injection, path
// traversal, and cross-user collision as possibilities by construction: the
// key space is a random UUID, not attacker-influenced text.
function generateKey(originalFilename) {

    const ext = path.extname(originalFilename || "").toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error(`Rejected upload key generation: disallowed extension "${ext}"`);
    }

    return `${crypto.randomUUID()}${ext}`;

}

module.exports = { generateKey, ALLOWED_EXTENSIONS };
