const request = require("supertest");

const app = require("../src/app");
const { MAX_IMAGE_UPLOAD_BYTES } = require("../src/config/uploadLimits");

// Real magic-byte prefixes, padded out so each buffer looks like a plausible
// (if tiny/invalid-as-an-actual-image) file of that format - the controller
// only inspects the first 12 bytes, so padding just needs to exist.
const JPEG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 0)]);
const PNG_BYTES = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(100, 0),
]);
const NOT_AN_IMAGE_BYTES = Buffer.from("#!/bin/sh\necho pwned\n".repeat(10));

describe("Upload API - production safety (STEP8)", () => {

    let token;

    beforeAll(async () => {

        const login = await request(app)
            .post("/api/auth/admin/login")
            .send({ email: "admin@vibebook.az", password: "Admin123@" });

        expect(login.status).toBe(200);

        token = login.body.token;

    });

    test("rejects request with no auth token", async () => {

        const response = await request(app)
            .post("/api/upload")
            .attach("image", JPEG_BYTES, { filename: "photo.jpg", contentType: "image/jpeg" });

        expect(response.status).toBe(401);

    });

    test("accepts a real JPEG (correct extension, MIME, and magic bytes)", async () => {

        const response = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", JPEG_BYTES, { filename: "photo.jpg", contentType: "image/jpeg" });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.path).toMatch(/^uploads\//);

    });

    test("accepts a real PNG (correct extension, MIME, and magic bytes)", async () => {

        const response = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", PNG_BYTES, { filename: "photo.png", contentType: "image/png" });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

    });

    test("rejects a non-image file with a disallowed extension (.sh)", async () => {

        const response = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", NOT_AN_IMAGE_BYTES, { filename: "payload.sh", contentType: "text/plain" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);

    });

    test("rejects an executable disguised as an image (.jpg extension + image/jpeg MIME, but non-image bytes) via magic-byte check", async () => {

        const response = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", NOT_AN_IMAGE_BYTES, { filename: "malicious.jpg", contentType: "image/jpeg" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/həqiqi şəkil deyil/);

    });

    test("rejects a corrupted/truncated JPEG (correct extension+MIME, invalid magic bytes)", async () => {

        const corrupted = Buffer.from([0x00, 0x00, 0x00]);

        const response = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", corrupted, { filename: "corrupt.jpg", contentType: "image/jpeg" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);

    });

    test("rejects a file exceeding the 20 MiB limit", async () => {

        const oversized = Buffer.concat([
            Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
            Buffer.alloc(MAX_IMAGE_UPLOAD_BYTES + 1024, 0),
        ]);

        const response = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", oversized, { filename: "huge.jpg", contentType: "image/jpeg" });

        expect(response.status).toBe(413);
        expect(response.body.success).toBe(false);

    }, 20000);

    test("rejects an unreachable/missing file field", async () => {

        const response = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);

    });

});
