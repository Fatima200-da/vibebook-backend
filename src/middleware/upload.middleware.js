const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { MAX_IMAGE_UPLOAD_BYTES, ACCEPTED_IMAGE_MIME_TYPES } = require("../config/uploadLimits");
const { generateKey } = require("../services/storage/keyGenerator");

// Anchored (not substring) match - the previous /jpg|jpeg|png|webp/.test(ext)
// would also accept a crafted extension like ".xjpgx", since a plain regex
// test only checks for the substring anywhere in the string.
const ACCEPTED_EXTENSION_PATTERN = /\.(jpe?g|png|webp)$/i;

const uploadPath = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}


const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, uploadPath);

    },

    filename: (req, file, cb) => {

        // Random UUID key, never the original filename - see
        // services/storage/keyGenerator.js for why. fileFilter below has
        // already rejected disallowed extensions by the time this runs, but
        // generateKey re-validates independently rather than trusting that.
        try {
            cb(null, generateKey(file.originalname));
        } catch (err) {
            cb(err);
        }

    }

});


const upload = multer({

    storage,

    limits: {
        fileSize: MAX_IMAGE_UPLOAD_BYTES
    },

    fileFilter: (req, file, cb) => {

        const ext = ACCEPTED_EXTENSION_PATTERN.test(file.originalname);

        const mime = ACCEPTED_IMAGE_MIME_TYPES.test(file.mimetype);

        if (ext && mime) {

            return cb(null, true);

        }

        cb(new Error("Yalnız şəkil faylları qəbul olunur (JPG, PNG, WEBP)."));

    }

});


module.exports = upload;