const request = require("supertest");

const app = require("../src/app");

// Phase 25D: GET /api/albums (and, the same bug, GET /api/admin/orders) used
// to include the full related `users` row via Prisma's `users: true` shorthand
// - which returns every scalar column, including the bcrypt password hash.
// Fixed by switching to an explicit `select` (id/full_name/email only),
// matching the pattern review.controller.js already used correctly. These
// tests assert the *shape* of the response never contains a credential
// field, rather than hardcoding any real bcrypt hash value.
const CREDENTIAL_FIELD_NAMES = ["password", "passwordHash", "hashedPassword", "hash"];

function assertNoCredentialFields(value, path = "root") {

    if (value === null || typeof value !== "object") return;

    if (Array.isArray(value)) {
        value.forEach((item, i) => assertNoCredentialFields(item, `${path}[${i}]`));
        return;
    }

    for (const key of Object.keys(value)) {

        if (CREDENTIAL_FIELD_NAMES.includes(key)) {
            throw new Error(`Credential-shaped field "${key}" found in response at ${path}.${key}`);
        }

        assertNoCredentialFields(value[key], `${path}.${key}`);

    }

}

describe("Credential Exposure Regression", () => {

    let token;
    let adminToken;
    let albumId;

    beforeAll(async () => {

        const email = `credential_exposure_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Credential Exposure Test", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        token = login.body.token;

        const adminLogin = await request(app).post("/api/auth/admin/login").send({
            email: "admin@vibebook.az", password: "Admin123@"
        });
        adminToken = adminLogin.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        const productId = products.body.data[0].id;

        const album = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ product_id: productId, title: "Credential Exposure Test Album", total_pages: 20 });

        albumId = album.body.data.id;

    });

    test("GET /api/albums (list) response contains no password hash - structural check", async () => {

        const response = await request(app).get("/api/albums").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(() => assertNoCredentialFields(response.body)).not.toThrow();

        // Belt-and-suspenders: also confirm the safe fields this endpoint
        // is actually supposed to return are still present, so the fix
        // didn't strip the include down to nothing.
        const own = response.body.data.find((a) => a.id === albumId);
        expect(own.users).toEqual(
            expect.objectContaining({ id: expect.any(String), full_name: expect.any(String), email: expect.any(String) })
        );

    });

    test("GET /api/albums/:id (single) response contains no password hash", async () => {

        const response = await request(app).get(`/api/albums/${albumId}`).set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(() => assertNoCredentialFields(response.body)).not.toThrow();

    });

    test("GET /api/me response contains no password hash", async () => {

        const response = await request(app).get("/api/me").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(() => assertNoCredentialFields(response.body)).not.toThrow();

    });

    test("GET /api/admin/orders (same users:true pattern, also fixed) contains no password hash", async () => {

        const response = await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(() => assertNoCredentialFields(response.body)).not.toThrow();

    });

    test("Existing authorized functionality is intact: album still lists correctly for its owner", async () => {

        const response = await request(app).get("/api/albums").set("Authorization", `Bearer ${token}`);

        expect(response.body.data.some((a) => a.id === albumId)).toBe(true);

    });

});
