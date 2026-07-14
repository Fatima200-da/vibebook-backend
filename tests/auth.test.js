const request = require("supertest");

const app = require("../src/app");

describe("Authentication API", () => {

    test("Admin login should succeed", async () => {

        const response = await request(app)
            .post("/api/auth/admin/login")
            .send({

                email: "admin@vibebook.az",

                password: "Admin123@"

            });

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.token).toBeDefined();

        expect(response.body.admin.email).toBe("admin@vibebook.az");

    });

    test("Admin login should fail with wrong password", async () => {

        const response = await request(app)
            .post("/api/auth/admin/login")
            .send({

                email: "admin@vibebook.az",

                password: "WrongPassword"

            });

        expect(response.status).toBe(401);

        expect(response.body.success).toBe(false);

    });

    test("Admin login should fail with unknown email", async () => {

        const response = await request(app)
            .post("/api/auth/admin/login")
            .send({

                email: "unknown@vibebook.az",

                password: "Admin123@"

            });

        expect(response.status).toBe(401);

        expect(response.body.success).toBe(false);

    });

});