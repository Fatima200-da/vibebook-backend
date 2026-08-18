// Storage abstraction facade. Every consumer (upload.controller.js, and any
// future delete/cleanup code) goes through this module instead of touching
// fs or an S3 client directly - swapping STORAGE_PROVIDER is the only thing
// that should ever change which backend actually holds the bytes.
const { provider, isS3Configured } = require("../../config/storageConfig");
const local = require("./localStorageAdapter");
const s3 = require("./s3StorageAdapter");
const { generateKey } = require("./keyGenerator");

function getAdapter() {

    if (provider === "s3") {

        if (!isS3Configured()) {
            throw new Error(
                "STORAGE_PROVIDER=s3 but one or more STORAGE_S3_* variables are missing - refusing to silently fall back to local storage in this state."
            );
        }

        return s3;

    }

    return local;

}

module.exports = {
    provider,
    generateKey,
    save: (...args) => getAdapter().save(...args),
    remove: (...args) => getAdapter().remove(...args),
    exists: (...args) => getAdapter().exists(...args),
    getUrl: (...args) => getAdapter().getUrl(...args),
};
