const request = require("supertest");

const app = require("../src/app");

describe("Health Check API", () => {

    test("GET / should return 200", async () => {

        const response = await request(app)
            .get("/");

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe("VibeBook Backend Running 🚀");

    });

});