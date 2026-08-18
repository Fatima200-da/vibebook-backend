const fs = require("fs");
const path = require("path");

// Same physical directory the project has always used - multer's diskStorage
// (upload.middleware.js) already writes here directly, so this adapter's
// job for "local" mode is bookkeeping (exists/remove/getUrl) around a file
// that's already on disk, not moving it. This is what keeps local/dev
// behavior byte-for-byte identical to before this module existed.
const uploadRoot = path.join(__dirname, "../../../uploads");

function resolvePath(key) {
    // path.basename strips any directory component a caller might pass in,
    // so even a key that somehow contained "../" can never escape uploadRoot.
    return path.join(uploadRoot, path.basename(key));
}

// The file at `localPath` is already where it needs to be (multer wrote it
// directly into uploadRoot under this same key) - "save" only has to hand
// back the same relative-path contract every caller already expects.
async function save({ key }) {
    return { key, url: `uploads/${key}` };
}

function remove(key) {

    const target = resolvePath(key);

    if (!fs.existsSync(target)) {
        return false;
    }

    fs.unlinkSync(target);
    return true;

}

function exists(key) {
    return fs.existsSync(resolvePath(key));
}

function getUrl(key) {
    return `uploads/${key}`;
}

module.exports = { save, remove, exists, getUrl, uploadRoot };
