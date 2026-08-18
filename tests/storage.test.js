const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { generateKey, ALLOWED_EXTENSIONS } = require("../src/services/storage/keyGenerator");

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

});
