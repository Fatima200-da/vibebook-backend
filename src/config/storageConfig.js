// Single source of truth for which storage backend serves uploaded images.
// "local" (default) preserves the exact filesystem behavior this project has
// always used - zero behavior change for anyone not opting in. "s3" targets
// any S3-compatible object storage (AWS S3, MinIO, DigitalOcean Spaces,
// Cloudflare R2, etc.) via a generic endpoint, never a hardcoded provider.
// "supabase" targets Supabase Storage via its native JS SDK (distinct from
// "s3" - Supabase also exposes an S3-compatible endpoint, which could go
// through the s3 adapter instead, but this provider uses the real Supabase
// client and SUPABASE_* credentials directly, as requested).
const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();

const s3 = {
    endpoint: process.env.STORAGE_S3_ENDPOINT || "",
    region: process.env.STORAGE_S3_REGION || "us-east-1",
    bucket: process.env.STORAGE_S3_BUCKET || "",
    accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY || "",
    // Public base URL for constructing image links (e.g. a CDN in front of
    // the bucket, or the bucket's own public endpoint). Required separately
    // from `endpoint` because many S3-compatible providers serve reads from
    // a different host than the API endpoint used for writes.
    publicUrlBase: process.env.STORAGE_S3_PUBLIC_URL_BASE || "",
    // Path-style addressing (bucket in the URL path) is required by most
    // non-AWS S3-compatible providers (MinIO, etc.); AWS itself defaults to
    // virtual-hosted style. Left explicit rather than guessed from the host.
    forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === "true",
};

function isS3Configured() {
    return Boolean(s3.endpoint && s3.bucket && s3.accessKeyId && s3.secretAccessKey && s3.publicUrlBase);
}

const supabase = {
    url: process.env.SUPABASE_URL || "",
    // The service-role key bypasses Row Level Security - it must only ever
    // live in this backend process's environment, never be logged, never be
    // sent in any API response, and never reach the frontend bundle (no
    // VITE_* variable may hold it).
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "",
};

function isSupabaseConfigured() {
    return Boolean(supabase.url && supabase.serviceRoleKey && supabase.bucket);
}

module.exports = { provider, s3, isS3Configured, supabase, isSupabaseConfigured };
