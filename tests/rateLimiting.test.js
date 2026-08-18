// Phase 20 STEP6 - proves the per-endpoint auth rate limiter actually
// engages, rather than just asserting the middleware is wired in. Isolated
// in its own file so its login-spamming doesn't burn the shared limiter
// budget other test files rely on (Jest gives each test file its own
// module registry, so this app instance's limiter store starts fresh).

const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

describe("Auth endpoint rate limiting (Phase 20 STEP6)", () => {

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("blocks login attempts after the configured threshold", async () => {

        const email = `ratelimit_${Date.now()}@test.com`;

        let lastResponse;

        // authLimiter allows 10 requests per window - the 11th must be
        // rejected regardless of credentials being valid or invalid.
        for (let i = 0; i < 11; i++) {
            lastResponse = await request(app)
                .post("/api/auth/login")
                .send({ email, password: "wrong-password" });
        }

        expect(lastResponse.status).toBe(429);
        expect(lastResponse.body.success).toBe(false);

    });

});
