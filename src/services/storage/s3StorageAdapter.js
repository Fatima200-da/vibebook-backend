const fs = require("fs");
const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const { s3: s3Config } = require("../../config/storageConfig");

const CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
};

// Lazily constructed so a process running in "local" mode never touches this
// file's config validation or instantiates a client it doesn't need.
let client = null;

function getClient() {

    if (!client) {

        client = new S3Client({
            endpoint: s3Config.endpoint,
            region: s3Config.region,
            forcePathStyle: s3Config.forcePathStyle,
            credentials: {
                accessKeyId: s3Config.accessKeyId,
                secretAccessKey: s3Config.secretAccessKey,
            },
        });

    }

    return client;

}

function contentTypeFor(key) {
    const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
    return CONTENT_TYPES[ext] || "application/octet-stream";
}

// Reads the file multer already wrote to local disk and pushes it to the
// configured bucket under the same random key - the local copy is the
// caller's responsibility to clean up (see upload.controller.js), this
// adapter only owns the remote object.
async function save({ key, localPath }) {

    const body = fs.readFileSync(localPath);

    await getClient().send(
        new PutObjectCommand({
            Bucket: s3Config.bucket,
            Key: key,
            Body: body,
            ContentType: contentTypeFor(key),
        })
    );

    return { key, url: getUrl(key) };

}

async function remove(key) {

    try {

        await getClient().send(
            new DeleteObjectCommand({ Bucket: s3Config.bucket, Key: key })
        );

        return true;

    } catch (err) {

        // Object already gone / never existed - not a failure from the
        // caller's point of view, matches localStorageAdapter.remove()'s
        // "already absent" == false-but-not-thrown contract.
        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
            return false;
        }

        throw err;

    }

}

async function exists(key) {

    try {

        await getClient().send(
            new HeadObjectCommand({ Bucket: s3Config.bucket, Key: key })
        );

        return true;

    } catch (err) {

        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
            return false;
        }

        throw err;

    }

}

function getUrl(key) {
    return `${s3Config.publicUrlBase.replace(/\/+$/, "")}/${key}`;
}

module.exports = { save, remove, exists, getUrl };
