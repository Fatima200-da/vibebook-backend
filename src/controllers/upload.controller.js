const fs = require("fs");

const storage = require("../services/storage");

// fileFilter only sees the client-supplied extension and Content-Type -
// both attacker-controlled, so it will happily pass a renamed non-image
// file through. This checks the real bytes of what disk storage just wrote,
// so anything that isn't actually a JPEG/PNG/WEBP (a corrupted file, or a
// script/binary disguised with an image extension) is rejected and removed
// rather than sitting in /uploads under an image/* Content-Type.
function isValidImageSignature(buffer) {

    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return true; // JPEG
    }

    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
    ) {
        return true; // PNG
    }

    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return true; // WEBP
    }

    return false;

}

exports.uploadFile = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,
                message: "Fayl seçilməyib"

            });

        }

        const header = Buffer.alloc(12);
        const fd = fs.openSync(req.file.path, "r");
        fs.readSync(fd, header, 0, 12, 0);
        fs.closeSync(fd);

        if (!isValidImageSignature(header)) {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                success: false,
                message: "Fayl həqiqi şəkil deyil və ya zədələnib."
            });

        }

        // multer's diskStorage has already written the validated file to the
        // local uploads/ dir under this key - `save()` hands that same file
        // to whichever backend STORAGE_PROVIDER selects. In "local" mode
        // (default, unchanged from before this module existed) this is a
        // no-op that returns the exact same "uploads/<key>" contract the
        // frontend's resolveImageUrl() has always expected. In "s3" mode it
        // additionally pushes the bytes to the configured bucket and returns
        // an absolute URL - resolveImageUrl() already passes absolute URLs
        // through unchanged, so no frontend change is required either way.
        const { url } = await storage.save({ key: req.file.filename, localPath: req.file.path });

        if (storage.provider === "s3") {
            // The bucket now holds the durable copy; the local disk copy
            // multer wrote was only ever a staging area for the magic-byte
            // check above and is not needed once save() has succeeded.
            fs.unlinkSync(req.file.path);
        }

        res.json({

            success: true,

            message: "Şəkil uğurla yükləndi",

            data: {

                filename: req.file.filename,

                path: url,

                originalname: req.file.originalname,

                size: req.file.size,

                mimetype: req.file.mimetype

            }

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};