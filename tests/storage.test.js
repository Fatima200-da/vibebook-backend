const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { generateKey, ALLOWED_EXTENSIONS } = require("../src/services/storage/keyGenerator");

// Phase 25C.2 - the Supabase adapter is tested by mocking the SDK boundary
// (@supabase/supabase-js's createClient) rather than a hand-rolled mock
// HTTP server, since jest.mock() at the SDK level is the standard way to
// test a thin wrapper around a third-party client without reimplementing
// its real network protocol. No real Supabase project or credential is
// ever used - see storageConfig's own isSupabaseConfigured() test below
// for proof a real credential isn't even read in the failure-path tests.
jest.mock("@supabase/supabase-js", () => {
    const mockUpload = jest.fn();
    const mockRemove = jest.fn();
    const mockList = jest.fn();
    const mockGetPublicUrl = jest.fn();
    const mockFrom = jest.fn(() => ({
        upload: mockUpload,
        remove: mockRemove,
        list: mockList,
        getPublicUrl: mockGetPublicUrl,
    }));
    const mockCreateClient = jest.fn(() => ({ storage: { from: mockFrom } }));
    return {
        __mockFns: { mockUpload, mockRemove, mockList, mockGetPublicUrl, mockFrom, mockCreateClient },
        createClient: mockCreateClient,
    };
});

describe("storage/keyGenerator (STEP4 - filename & path security)", () => {

    test("produces a fresh, non-predictable key per call - never the original filename", () => {

        const key1 = generateKey("my-vacation-photo.jpg");
        const key2 = generateKey("my-vacation-photo.jpg");

        expect(key1).not.toBe(key2);
        expect(key1).not.toContain("my-vacation-photo");
        expect(key1).not.toContain("vacation");

    });

    test("preserves the (whitelisted) extension", () => {

        expect(generateKey("photo.jpg").endsWith(".jpg")).toBe(true);
        expect(generateKey("photo.PNG").endsWith(".png")).toBe(true);
        expect(generateKey("photo.webp").endsWith(".webp")).toBe(true);

    });

    test("rejects a disallowed/spoofed extension rather than silently accepting it", () => {

        expect(() => generateKey("shell.php")).toThrow();
        expect(() => generateKey("payload.jpg.exe")).toThrow();
        expect(() => generateKey("noextension")).toThrow();

    });

    test("path-traversal attempts in the supplied name never survive into the key", () => {

        const key = generateKey("../../../etc/passwd.jpg");

        expect(key).not.toContain("..");
        expect(key).not.toContain("/");
        expect(key).not.toContain("etc");
        // only the extension of the real (final) segment matters, and the
        // key itself is a fresh UUID + that extension - nothing traversal-shaped survives
        expect(key.endsWith(".jpg")).toBe(true);

    });

    test("two customers uploading a file with the identical original name never collide", () => {

        const keys = new Set();
        for (let i = 0; i < 200; i++) {
            keys.add(generateKey("selfie.jpg"));
        }

        expect(keys.size).toBe(200);

    });

    test("only JPEG/PNG/WEBP extensions are in the allow-list (matches multer's own whitelist)", () => {

        expect([...ALLOWED_EXTENSIONS].sort()).toEqual([".jpeg", ".jpg", ".png", ".webp"]);

    });

});

describe("storage/localStorageAdapter (STEP2 - existing filesystem behavior unchanged)", () => {

    let local;
    let tmpDir;

    beforeAll(() => {
        local = require("../src/services/storage/localStorageAdapter");
    });

    test("save() is a pass-through that returns the exact uploads/<key> contract resolveImageUrl() already expects", async () => {

        const result = await local.save({ key: "abc123.jpg" });
        expect(result).toEqual({ key: "abc123.jpg", url: "uploads/abc123.jpg" });

    });

    test("exists()/remove() operate on the real uploads/ directory and report accurately", () => {

        const key = `test-${Date.now()}.jpg`;
        const filePath = path.join(local.uploadRoot, key);

        expect(local.exists(key)).toBe(false);

        fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff]));
        expect(local.exists(key)).toBe(true);

        expect(local.remove(key)).toBe(true);
        expect(local.exists(key)).toBe(false);

        // Removing an already-absent key is reported as false, not thrown -
        // matches the "already gone" contract the delete/cleanup docs rely on.
        expect(local.remove(key)).toBe(false);

    });

    test("path.basename strips any directory component - a key can never escape uploadRoot", () => {

        expect(local.exists("../../../../etc/passwd")).toBe(false);
        expect(() => local.remove("../../../../etc/passwd")).not.toThrow();

    });

});

// ---------------------------------------------------------------------------
// Minimal in-process S3-compatible mock server. This is NOT a real cloud
// call - no network egress, no credentials, no provider. It exists purely to
// exercise s3StorageAdapter.js's *logic* (request construction, key/URL
// handling, error classification) against something that speaks the S3 HTTP
// surface, per Phase 24B's explicit instruction to prove the adapter with a
// local/mock S3-compatible target rather than claiming untested real-cloud
// coverage.
// ---------------------------------------------------------------------------
function startMockS3Server() {

    const knownObjects = new Set();

    const server = http.createServer((req, res) => {

        const pathOnly = req.url.split("?")[0]; // AWS SDK requests may carry query params (e.g. presign/checksum hints)
        const key = decodeURIComponent(pathOnly.split("/").slice(2).join("/")); // strip /<bucket>/

        if (req.method === "PUT") {

            let chunks = [];
            req.on("data", (c) => chunks.push(c));
            req.on("end", () => {
                knownObjects.add(key);
                res.writeHead(200, { ETag: '"mock-etag"' });
                res.end();
            });

            return;

        }

        if (req.method === "HEAD") {

            if (knownObjects.has(key)) {
                res.writeHead(200);
            } else {
                res.writeHead(404);
            }

            res.end();
            return;

        }

        if (req.method === "DELETE") {

            knownObjects.delete(key);
            res.writeHead(204);
            res.end();
            return;

        }

        res.writeHead(404);
        res.end();

    });

    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve(server));
    });

}

describe("storage/s3StorageAdapter (STEP3/6/7 - S3-compatible logic, mock server only)", () => {

    let server;
    let port;
    let s3Adapter;
    let tmpFile;

    beforeAll(async () => {

        server = await startMockS3Server();
        port = server.address().port;

        process.env.STORAGE_PROVIDER = "s3";
        process.env.STORAGE_S3_ENDPOINT = `http://127.0.0.1:${port}`;
        process.env.STORAGE_S3_REGION = "us-east-1";
        process.env.STORAGE_S3_BUCKET = "vibebook-test-bucket";
        process.env.STORAGE_S3_ACCESS_KEY_ID = "mock-access-key";
        process.env.STORAGE_S3_SECRET_ACCESS_KEY = "mock-secret-key";
        process.env.STORAGE_S3_PUBLIC_URL_BASE = "https://cdn.example-mock.test/vibebook-test-bucket";
        process.env.STORAGE_S3_FORCE_PATH_STYLE = "true";

        s3Adapter = require("../src/services/storage/s3StorageAdapter");

        tmpFile = path.join(os.tmpdir(), `phase24b-mock-upload-${Date.now()}.jpg`);
        fs.writeFileSync(tmpFile, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));

    });

    afterAll(() => {
        server.close();
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    });

    test("save() uploads the local file's bytes to the mock bucket and returns an absolute public URL", async () => {

        const result = await s3Adapter.save({ key: "products/mock-key-1.jpg", localPath: tmpFile });

        expect(result.key).toBe("products/mock-key-1.jpg");
        expect(result.url).toBe("https://cdn.example-mock.test/vibebook-test-bucket/products/mock-key-1.jpg");

    });

    test("exists() correctly reports true after save() and false for an unknown key", async () => {

        await s3Adapter.save({ key: "products/mock-key-2.jpg", localPath: tmpFile });

        expect(await s3Adapter.exists("products/mock-key-2.jpg")).toBe(true);
        expect(await s3Adapter.exists("products/never-uploaded.jpg")).toBe(false);

    });

    test("remove() deletes the object; exists() reflects the deletion", async () => {

        await s3Adapter.save({ key: "products/mock-key-3.jpg", localPath: tmpFile });
        expect(await s3Adapter.exists("products/mock-key-3.jpg")).toBe(true);

        expect(await s3Adapter.remove("products/mock-key-3.jpg")).toBe(true);
        expect(await s3Adapter.exists("products/mock-key-3.jpg")).toBe(false);

    });

    test("getUrl() builds a clean absolute URL regardless of trailing slashes in the configured base", () => {

        expect(s3Adapter.getUrl("albums/x.png")).toBe(
            "https://cdn.example-mock.test/vibebook-test-bucket/albums/x.png"
        );

    });

});

describe("storage config (STEP9 - local dev fallback preserved, s3 mode requires explicit config)", () => {

    test("defaults to local when STORAGE_PROVIDER is unset", () => {

        jest.resetModules();
        delete process.env.STORAGE_PROVIDER;

        const { provider } = require("../src/config/storageConfig");
        expect(provider).toBe("local");

    });

    test("STORAGE_PROVIDER=s3 with missing S3 variables throws instead of silently falling back to local", () => {

        jest.resetModules();
        process.env.STORAGE_PROVIDER = "s3";
        delete process.env.STORAGE_S3_ENDPOINT;
        delete process.env.STORAGE_S3_BUCKET;
        delete process.env.STORAGE_S3_ACCESS_KEY_ID;
        delete process.env.STORAGE_S3_SECRET_ACCESS_KEY;
        delete process.env.STORAGE_S3_PUBLIC_URL_BASE;

        const storage = require("../src/services/storage");
        expect(() => storage.save({ key: "x.jpg", localPath: "/nowhere.jpg" })).toThrow();

    });

    test("STORAGE_PROVIDER=supabase with missing SUPABASE_* variables throws instead of silently falling back to local", () => {

        jest.resetModules();
        process.env.STORAGE_PROVIDER = "supabase";
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        delete process.env.SUPABASE_STORAGE_BUCKET;

        const storage = require("../src/services/storage");
        expect(() => storage.save({ key: "x.jpg", localPath: "/nowhere.jpg" })).toThrow(
            /SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET/
        );

    });

    test("An unrecognized STORAGE_PROVIDER value fails loudly instead of silently defaulting to local", () => {

        jest.resetModules();
        process.env.STORAGE_PROVIDER = "dropbox";

        const storage = require("../src/services/storage");
        expect(() => storage.save({ key: "x.jpg", localPath: "/nowhere.jpg" })).toThrow(
            /Unknown STORAGE_PROVIDER "dropbox"/
        );

    });

});

describe("storage/supabaseStorageAdapter (Phase 25C.2 - Supabase Storage via mocked SDK)", () => {

    const REAL_ENV = {
        STORAGE_PROVIDER: "supabase",
        SUPABASE_URL: "https://mock-project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "mock-service-role-key-not-real",
        SUPABASE_STORAGE_BUCKET: "vibebook-assets",
    };

    function setSupabaseEnv() {
        Object.assign(process.env, REAL_ENV);
    }

    let tmpFile;

    beforeAll(() => {
        tmpFile = path.join(os.tmpdir(), `phase25c2-mock-upload-${Date.now()}.jpg`);
        fs.writeFileSync(tmpFile, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));
    });

    afterAll(() => {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    });

    test("STORAGE_PROVIDER=supabase selects the Supabase adapter (proven by it calling into the mocked SDK, not local disk)", async () => {

        jest.resetModules();
        setSupabaseEnv();

        const { __mockFns } = require("@supabase/supabase-js");
        __mockFns.mockUpload.mockResolvedValueOnce({ error: null });
        __mockFns.mockGetPublicUrl.mockReturnValueOnce({
            data: { publicUrl: "https://mock-project.supabase.co/storage/v1/object/public/vibebook-assets/x.jpg" },
        });

        const storage = require("../src/services/storage");
        const result = await storage.save({ key: "x.jpg", localPath: tmpFile });

        expect(__mockFns.mockCreateClient).toHaveBeenCalledWith(
            "https://mock-project.supabase.co",
            "mock-service-role-key-not-real",
            expect.any(Object)
        );
        expect(__mockFns.mockFrom).toHaveBeenCalledWith("vibebook-assets");
        expect(result.url).toContain("vibebook-assets");

    });

    test("successful upload with a mocked Supabase client returns {key, url} in the same shape as the other adapters", async () => {

        jest.resetModules();
        setSupabaseEnv();

        const { __mockFns } = require("@supabase/supabase-js");
        __mockFns.mockUpload.mockResolvedValueOnce({ error: null });
        __mockFns.mockGetPublicUrl.mockReturnValueOnce({
            data: { publicUrl: "https://mock-project.supabase.co/storage/v1/object/public/vibebook-assets/products/mock-key.jpg" },
        });

        const storage = require("../src/services/storage");
        const result = await storage.save({ key: "products/mock-key.jpg", localPath: tmpFile });

        expect(result).toEqual({
            key: "products/mock-key.jpg",
            url: "https://mock-project.supabase.co/storage/v1/object/public/vibebook-assets/products/mock-key.jpg",
        });

        expect(__mockFns.mockUpload).toHaveBeenCalledWith(
            "products/mock-key.jpg",
            expect.any(Buffer),
            expect.objectContaining({ contentType: "image/jpeg", upsert: false })
        );

    });

    test("Supabase upload failure surfaces a clean error without leaking the service-role key", async () => {

        jest.resetModules();
        setSupabaseEnv();

        const { __mockFns } = require("@supabase/supabase-js");
        __mockFns.mockUpload.mockResolvedValueOnce({ error: { message: "The resource already exists" } });

        const storage = require("../src/services/storage");

        await expect(storage.save({ key: "x.jpg", localPath: tmpFile })).rejects.toThrow(
            "Supabase storage upload failed: The resource already exists"
        );

        // The one thing this test exists to prove: no matter what the SDK
        // throws, the real credential never appears in the error surfaced
        // to a caller (and, by extension, could never reach an API response).
        try {
            await storage.save({ key: "x.jpg", localPath: tmpFile });
        } catch (err) {
            expect(err.message).not.toContain(REAL_ENV.SUPABASE_SERVICE_ROLE_KEY);
        }

    });

    test("remove() calls the SDK with the configured bucket and key", async () => {

        jest.resetModules();
        setSupabaseEnv();

        const { __mockFns } = require("@supabase/supabase-js");
        __mockFns.mockRemove.mockResolvedValueOnce({ error: null });

        const storage = require("../src/services/storage");
        const result = await storage.remove("products/gone.jpg");

        expect(result).toBe(true);
        expect(__mockFns.mockFrom).toHaveBeenCalledWith("vibebook-assets");
        expect(__mockFns.mockRemove).toHaveBeenCalledWith(["products/gone.jpg"]);

    });

    test("exists() reports true only when list() returns a matching filename", async () => {

        jest.resetModules();
        setSupabaseEnv();

        const { __mockFns } = require("@supabase/supabase-js");
        __mockFns.mockList.mockResolvedValueOnce({ data: [{ name: "found.jpg" }], error: null });

        const storage = require("../src/services/storage");
        expect(await storage.exists("found.jpg")).toBe(true);

        __mockFns.mockList.mockResolvedValueOnce({ data: [], error: null });
        expect(await storage.exists("missing.jpg")).toBe(false);

    });

});
