const request = require("supertest");

const app = require("../src/app");

// Phase 25 staging QA follow-up: POST /api/albums with a missing/invalid
// total_pages used to reach prisma.albums.create() directly (Number(undefined)
// = NaN), which Prisma rejected with a raw internal validation error exposing
// schema/relation/type names - a real information-disclosure bug, not just a
// confusing 500. album.controller.js now validates title/total_pages before
// ever calling Prisma.
describe("Album Creation Validation", () => {

    let token;

    beforeAll(async () => {

        const email = `album_validation_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Album Validation", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        token = login.body.token;

    });

    test("Missing total_pages returns 400 with a clean message, never a raw Prisma error", async () => {

        const response = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "No Pages Album" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("total_pages is required and must be a positive integer");

        // The original bug's signature: Prisma internals leaking into the
        // response body. Assert none of that vocabulary appears anywhere.
        const raw = JSON.stringify(response.body);
        expect(raw).not.toMatch(/prisma\./i);
        expect(raw).not.toMatch(/Unknown argument/i);
        expect(raw).not.toMatch(/CreateNestedOneWithout/i);

    });

    test("Invalid (non-numeric) total_pages returns 400", async () => {

        const response = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Bad Pages Album", total_pages: "not-a-number" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);

    });

    test("Zero or negative total_pages returns 400", async () => {

        const zeroResp = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Zero Pages Album", total_pages: 0 });

        expect(zeroResp.status).toBe(400);

        const negativeResp = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Negative Pages Album", total_pages: -5 });

        expect(negativeResp.status).toBe(400);

    });

    test("Missing title returns 400", async () => {

        const response = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ total_pages: 20 });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("title is required");

    });

    test("Valid payload still succeeds exactly as before (title + total_pages, no product/template)", async () => {

        const response = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Valid Album", total_pages: 20 });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe("Valid Album");
        expect(response.body.data.total_pages).toBe(20);
        expect(response.body.data.product_id).toBeNull();
        expect(response.body.data.template_id).toBeNull();

    });

    test("Valid payload with product_id and template_id still succeeds", async () => {

        const products = await request(app).get("/api/public/products?limit=1");
        const productId = products.body.data[0].id;

        const response = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Full Valid Album", total_pages: 30, product_id: productId });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.product_id).toBe(productId);

    });

});
