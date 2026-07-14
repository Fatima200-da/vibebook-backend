const request = require("supertest");

const app = require("../src/app");

describe("Products API", () => {

    let token;

    let productId;

    beforeAll(async () => {

        const login = await request(app)

            .post("/api/auth/admin/login")

            .send({

                email: "admin@vibebook.az",

                password: "Admin123@"

            });

        expect(login.status).toBe(200);

        token = login.body.token;

    });

    test("Get Products", async () => {

        const response = await request(app)

            .get("/api/products")

            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

        expect(Array.isArray(response.body.data)).toBe(true);

    });

    test("Search Products", async () => {

        const response = await request(app)

            .get("/api/products/search?q=Wedding")

            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

    });

    test("Create Product", async () => {

        const response = await request(app)

            .post("/api/products")

            .set("Authorization", `Bearer ${token}`)

            .send({

                category_id: "ab2c665b-21c0-4866-b900-2a07fde05eb5",

                title: "Jest Test Product",

                description: "Created by Jest",

                price: 150,

                cover_type: "Hard",

                min_pages: 20,

                max_pages: 40

            });

        expect(response.status).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.data.title).toBe("Jest Test Product");

        productId = response.body.data.id;

    });

    test("Get Product By Id", async () => {

        const response = await request(app)

            .get(`/api/products/${productId}`)

            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

    });

    test("Update Product", async () => {

        const response = await request(app)

            .put(`/api/products/${productId}`)

            .set("Authorization", `Bearer ${token}`)

            .send({

                title: "Updated Jest Product",

                price: 175

            });

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data.title).toBe("Updated Jest Product");

    });

    test("Soft Delete Product", async () => {

        const response = await request(app)

            .delete(`/api/products/${productId}`)

            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

    });

    test("Get Trash Products", async () => {

        const response = await request(app)

            .get("/api/products/trash")

            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

        expect(Array.isArray(response.body.data)).toBe(true);

    });

    test("Restore Product", async () => {

        const response = await request(app)

            .patch(`/api/products/${productId}/restore`)

            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

    });

});