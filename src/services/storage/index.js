// Storage abstraction facade. Every consumer (upload.controller.js, and any
// future delete/cleanup code) goes through this module instead of touching
// fs, an S3 client, or the Supabase client directly - swapping
// STORAGE_PROVIDER is the only thing that should ever change which backend
// actually holds the bytes.
const { provider, isS3Configured, isSupabaseConfigured } = require("../../config/storageConfig");
const local = require("./localStorageAdapter");
const s3 = require("./s3StorageAdapter");
const supabase = require("./supabaseStorageAdapter");
const { generateKey } = require("./keyGenerator");

const KNOWN_PROVIDERS = ["local", "s3", "supabase"];

function getAdapter() {

    if (provider === "s3") {

        if (!isS3Configured()) {
            throw new Error(
                "STORAGE_PROVIDER=s3 but one or more STORAGE_S3_* variables are missing - refusing to silently fall back to local storage in this state."
            );
        }

        return s3;

    }

    if (provider === "supabase") {

        if (!isSupabaseConfigured()) {
            throw new Error(
                "STORAGE_PROVIDER=supabase but one or more SUPABASE_* variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET) are missing - refusing to silently fall back to local storage in this state."
            );
        }

        return supabase;

    }

    if (provider === "local") {
        return local;
    }

    // An unrecognized STORAGE_PROVIDER value previously fell through to
    // local storage silently - on a platform with an ephemeral filesystem
    // (Render) that means uploads appear to succeed while never actually
    // persisting anywhere, which is worse than a loud failure. Fail fast
    // instead.
    throw new Error(
        `Unknown STORAGE_PROVIDER "${provider}" - must be one of: ${KNOWN_PROVIDERS.join(", ")}.`
    );

}

module.exports = {
    provider,
    generateKey,
    save: (...args) => getAdapter().save(...args),
    remove: (...args) => getAdapter().remove(...args),
    exists: (...args) => getAdapter().exists(...args),
    getUrl: (...args) => getAdapter().getUrl(...args),
};
