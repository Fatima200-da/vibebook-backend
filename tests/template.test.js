const request = require("supertest");

const app = require("../src/app");

describe("Templates API", () => {

    let token;
    let templateId;

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

    test("Create Template with album_size_key and pages layout", async () => {

        const response = await request(app)
            .post("/api/templates")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: `Jest Test Template ${Date.now()}`,
                description: "Created by Jest",
                preview_image: null,
                album_size_key: "20x20",
                pages: {
                    pages: [
                        {
                            pageNumber: 1,
                            elements: [
                                { type: "image", xPercent: 0.1, yPercent: 0.1, widthPercent: 0.5, heightPercent: 0.4, rotation: 0, zIndex: 0 },
                            ],
                        },
                    ],
                },
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.album_size_key).toBe("20x20");
        expect(response.body.data.pages.pages).toHaveLength(1);

        templateId = response.body.data.id;

    });

    test("Get Templates includes album_size_key", async () => {

        const response = await request(app)
            .get("/api/templates")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        const created = response.body.data.find((t) => t.id === templateId);
        expect(created).toBeDefined();
        expect(created.album_size_key).toBe("20x20");

    });

    test("Public templates endpoint requires no auth and includes album_size_key", async () => {

        const response = await request(app).get("/api/public/templates");

        expect(response.status).toBe(200);
        const created = response.body.data.find((t) => t.id === templateId);
        expect(created).toBeDefined();
        expect(created.album_size_key).toBe("20x20");

    });

    test("Update Template changes album_size_key and pages", async () => {

        const response = await request(app)
            .put(`/api/templates/${templateId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: `Jest Test Template Updated ${Date.now()}`,
                description: "Updated by Jest",
                album_size_key: "30x30",
                pages: { pages: [] },
            });

        expect(response.status).toBe(200);
        expect(response.body.data.album_size_key).toBe("30x30");

    });

    test("Delete Template", async () => {

        const response = await request(app)
            .delete(`/api/templates/${templateId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const getResponse = await request(app)
            .get(`/api/templates/${templateId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(getResponse.status).toBe(404);

    });

    test("Non-admin cannot create a template", async () => {

        const email = `template_customer_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Template Customer", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });

        const response = await request(app)
            .post("/api/templates")
            .set("Authorization", `Bearer ${login.body.token}`)
            .send({ name: "Should Not Be Created" });

        expect(response.status).toBe(403);

    });

});
