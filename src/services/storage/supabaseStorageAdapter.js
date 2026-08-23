const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const { supabase: supabaseConfig } = require("../../config/storageConfig");

const CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
};

// Lazily constructed, same reasoning as s3StorageAdapter.js's getClient():
// a process running in "local" or "s3" mode should never instantiate this
// client or touch its config.
let client = null;

function getClient() {

    if (!client) {

        client = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
            auth: {
                // This is a server-only service-role client with no signed-in
                // user - persisting/refreshing an auth session makes no sense
                // here and would be a needless background timer per request.
                persistSession: false,
                autoRefreshToken: false,
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
// adapter only owns the remote object. upsert:false matches the key
// scheme's own guarantee (crypto.randomUUID()-based, never expected to
// collide) - a silent overwrite here would only ever mask a real bug.
async function save({ key, localPath }) {

    const body = fs.readFileSync(localPath);

    const { error } = await getClient()
        .storage
        .from(supabaseConfig.bucket)
        .upload(key, body, {
            contentType: contentTypeFor(key),
            upsert: false,
        });

    if (error) {
        // error.message is Supabase's own client-side message (e.g. "The
        // resource already exists") - never includes the service-role key,
        // but re-wrap anyway so nothing about the underlying HTTP/client
        // internals can leak through an unexpected error shape.
        throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    return { key, url: getUrl(key) };

}

async function remove(key) {

    const { error } = await getClient()
        .storage
        .from(supabaseConfig.bucket)
        .remove([key]);

    if (error) {
        throw new Error(`Supabase storage remove failed: ${error.message}`);
    }

    // Supabase's remove() does not distinguish "deleted" from "was never
    // there" in its response - both come back as a non-error, empty-ish
    // result. Matches localStorageAdapter/s3StorageAdapter's contract only
    // loosely: callers here get `true` for "the API call succeeded",
    // rather than a hard guarantee the key previously existed.
    return true;

}

async function exists(key) {

    // The Supabase JS Storage API has no HEAD-equivalent - list() with a
    // search term scoped to the exact filename is the documented way to
    // check for a single object's existence without downloading it.
    const { data, error } = await getClient()
        .storage
        .from(supabaseConfig.bucket)
        .list("", { search: key });

    if (error) {
        throw new Error(`Supabase storage exists check failed: ${error.message}`);
    }

    return Array.isArray(data) && data.some((entry) => entry.name === key);

}

function getUrl(key) {

    const { data } = getClient()
        .storage
        .from(supabaseConfig.bucket)
        .getPublicUrl(key);

    return data.publicUrl;

}

module.exports = { save, remove, exists, getUrl };
