const request = require("supertest");

const app = require("../src/app");

describe("Public Storefront Browsing API", () => {

    test("Public products list works with no Authorization header", async () => {

        const response = await request(app)
            .get("/api/public/products?limit=3");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

    });

    test("Public product detail works with no Authorization header", async () => {

        const list = await request(app).get("/api/public/products?limit=1");

        expect(list.body.data.length).toBeGreaterThan(0);

        const id = list.body.data[0].id;

        const response = await request(app).get(`/api/public/products/${id}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(id);

    });

    test("Public categories list works with no Authorization header", async () => {

        const response = await request(app).get("/api/public/categories");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

    });

    test("Public templates list works with no Authorization header", async () => {

        const response = await request(app).get("/api/public/templates");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

    });

    test("Public settings works with no Authorization header", async () => {

        const response = await request(app).get("/api/public/settings");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

    });

});
