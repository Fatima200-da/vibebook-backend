const request = require("supertest");
const prisma = require("../src/config/prisma");
const app = require("../src/app");

describe("Products API", () => {

    let token;
    let productId;
    let categoryId;

    beforeAll(async () => {

        const login = await request(app)
            .post("/api/auth/admin/login")
            .send({
                email: "admin@vibebook.az",
                password: "Admin123@"
            });

        expect(login.status).toBe(200);

        token = login.body.token;

        const category = await prisma.categories.findFirst({
            where: {
                name: "Wedding"
            }
        });

        expect(category).not.toBeNull();

        categoryId = category.id;

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
                category_id: categoryId,
                title: "Jest Test Product",
                description: "Created by Jest",
                price: 150,
                cover_type: "Hard",
                min_pages: 20,
                max_pages: 40
            });

        console.log("CREATE PRODUCT RESPONSE:");
        console.log(response.body);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);

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

    });

    // Phase 25C: image replacement never deletes the previous storage
    // object - this is a deliberate, documented Phase 24B decision
    // (storage.remove() was never wired into any controller's update/delete
    // path), not an oversight. Locking in the current, real behavior so a
    // future change to this policy is a conscious decision, not an accident.
    test("Replacing a product's image field updates the DB but never deletes the old storage object", async () => {

        const oldImage = "uploads/products/old-test-image.jpg";
        const newImage = "uploads/products/new-test-image.jpg";

        const setOld = await request(app)
            .put(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Updated Jest Product", price: 175, image: oldImage });

        expect(setOld.status).toBe(200);
        expect(setOld.body.data.image).toBe(oldImage);

        const setNew = await request(app)
            .put(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Updated Jest Product", price: 175, image: newImage });

        expect(setNew.status).toBe(200);
        expect(setNew.body.data.image).toBe(newImage);

        // No storage.remove() call exists anywhere in the codebase (grep
        // confirms it) - the old key is never touched, so it would still
        // exist in whatever backend actually stored it. This test can only
        // assert the DB-visible half of that contract (the field moved to
        // the new value); the "old file still exists in storage" half is a
        // property of the code never calling remove(), not something an
        // API-level test can independently observe.

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