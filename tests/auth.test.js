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

// Phase 25 staging QA follow-up: customer login previously had no upfront
// missing-field check, so an empty/missing email or password fell through
// to the same "user not found" path as a real 401 - correct-ish, but the
// wrong status code for a malformed request. Validated separately from
// actual authentication failures below.
//
// Every /api/auth/register and /api/auth/login call shares the same
// per-IP authLimiter budget (10 requests/15min) as every other test file
// in this --runInBand suite, so this block deliberately reuses one
// registered account across cases instead of registering fresh per test.
describe("Customer Login Validation", () => {

    let sharedEmail;

    beforeAll(async () => {

        sharedEmail = `login_validation_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Login Validation", email: sharedEmail, password: "Cust123@"
        });

    });

    test("Login with missing email and password returns 400 (not 401)", async () => {

        const response = await request(app)
            .post("/api/auth/login")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);

    });

    test("Login with wrong password for a real account still returns 401 (not 400)", async () => {

        const response = await request(app)
            .post("/api/auth/login")
            .send({ email: sharedEmail, password: "WrongPassword" });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);

    });

    test("Login with nonexistent account still returns 401 (not 400)", async () => {

        const response = await request(app)
            .post("/api/auth/login")
            .send({ email: `nonexistent_${Date.now()}@test.com`, password: "SomePassword1" });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);

    });

    test("Login with valid credentials still succeeds (existing behavior unchanged)", async () => {

        const response = await request(app)
            .post("/api/auth/login")
            .send({ email: sharedEmail, password: "Cust123@" });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();

    });

});