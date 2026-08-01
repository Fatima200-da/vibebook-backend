const request = require("supertest");

const app = require("../src/app");

describe("Customer Self-Service Profile API", () => {

    let token;
    const email = `me_test_${Date.now()}@test.com`;

    beforeAll(async () => {

        await request(app)
            .post("/api/auth/register")
            .send({
                full_name: "Me Tester",
                email,
                password: "Cust123@"
            });

        const login = await request(app)
            .post("/api/auth/login")
            .send({ email, password: "Cust123@" });

        expect(login.status).toBe(200);

        token = login.body.token;

    });

    test("GET /api/me returns the safe profile shape, no password", async () => {

        const response = await request(app)
            .get("/api/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe(email);
        expect(response.body.data.password).toBeUndefined();

    });

    test("PUT /api/me updates full_name and phone", async () => {

        const response = await request(app)
            .put("/api/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ full_name: "Me Tester Updated", phone: "0501234567" });

        expect(response.status).toBe(200);
        expect(response.body.data.full_name).toBe("Me Tester Updated");
        expect(response.body.data.phone).toBe("0501234567");

    });

    test("PUT /api/me with password change requires correct current_password", async () => {

        const wrong = await request(app)
            .put("/api/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ current_password: "WrongPass1", password: "NewPass123" });

        expect(wrong.status).toBe(400);

        const right = await request(app)
            .put("/api/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ current_password: "Cust123@", password: "NewPass123" });

        expect(right.status).toBe(200);

    });

    test("GET /api/me fails without a token", async () => {

        const response = await request(app).get("/api/me");

        expect(response.status).toBe(401);

    });

});
