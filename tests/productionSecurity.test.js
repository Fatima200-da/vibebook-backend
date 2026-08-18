// Phase 20 - final pre-production audit: admin/customer token separation
// (STEP3) and IDOR coverage for resources not already exercised by earlier
// phases' test files (addresses, wishlist) (STEP4).

const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

describe("Admin/customer authentication separation (Phase 20 STEP3)", () => {

    let customerToken;
    let adminToken;

    beforeAll(async () => {

        const email = `sec_customer_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Security Customer", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        customerToken = login.body.token;

        const adminLogin = await request(app).post("/api/auth/admin/login").send({
            email: "admin@vibebook.az", password: "Admin123@"
        });
        adminToken = adminLogin.body.token;

    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("rejects unauthenticated access to the admin dashboard", async () => {
        const response = await request(app).get("/api/admin/dashboard");
        expect(response.status).toBe(401);
    });

    it("rejects a customer token on the admin dashboard", async () => {
        const response = await request(app)
            .get("/api/admin/dashboard")
            .set("Authorization", `Bearer ${customerToken}`);
        expect(response.status).toBe(403);
    });

    it("allows an admin token on the admin dashboard", async () => {
        const response = await request(app)
            .get("/api/admin/dashboard")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
    });

    it("rejects a customer token on the admin profile endpoint", async () => {
        const response = await request(app)
            .get("/api/admin/profile")
            .set("Authorization", `Bearer ${customerToken}`);
        expect(response.status).toBe(403);
    });

    it("rejects a customer token on an admin-only product write", async () => {
        const response = await request(app)
            .post("/api/products")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({ title: "Should not be created", price: 10 });
        expect(response.status).toBe(403);
    });

    it("does not break the customer's own flow with an admin token present separately", async () => {
        // Admin token exists in this suite the whole time; confirm the
        // customer token still independently works for its own flow.
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", `Bearer ${customerToken}`);
        expect(response.status).toBe(200);
        expect(response.body.data.role).toBe("USER");
    });

});

describe("Cross-customer IDOR - addresses and wishlist (Phase 20 STEP4)", () => {

    let tokenA;
    let tokenB;
    let productId;

    beforeAll(async () => {

        const emailA = `idor_a_${Date.now()}@test.com`;
        const emailB = `idor_b_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({ full_name: "IDOR A", email: emailA, password: "Cust123@" });
        await request(app).post("/api/auth/register").send({ full_name: "IDOR B", email: emailB, password: "Cust123@" });

        const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password: "Cust123@" });
        const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password: "Cust123@" });

        tokenA = loginA.body.token;
        tokenB = loginB.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        productId = products.body.data[0].id;

    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("blocks customer B from reading, updating, or deleting customer A's address", async () => {

        const created = await request(app)
            .post("/api/me/addresses")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ full_name: "A", phone: "0501234567", city: "Baku", address_line: "Street 1" });

        expect(created.status).toBe(201);
        const addressId = created.body.data.id;

        const updateAsB = await request(app)
            .put(`/api/me/addresses/${addressId}`)
            .set("Authorization", `Bearer ${tokenB}`)
            .send({ full_name: "Hijacked" });
        expect(updateAsB.status).toBe(403);

        const deleteAsB = await request(app)
            .delete(`/api/me/addresses/${addressId}`)
            .set("Authorization", `Bearer ${tokenB}`);
        expect(deleteAsB.status).toBe(403);

        const listAsB = await request(app)
            .get("/api/me/addresses")
            .set("Authorization", `Bearer ${tokenB}`);
        expect(listAsB.body.data.find((a) => a.id === addressId)).toBeUndefined();

    });

    it("scopes wishlist strictly to the requesting customer", async () => {

        await request(app)
            .post(`/api/me/wishlist/${productId}`)
            .set("Authorization", `Bearer ${tokenA}`);

        const wishlistB = await request(app)
            .get("/api/me/wishlist")
            .set("Authorization", `Bearer ${tokenB}`);

        expect(wishlistB.body.data.find((w) => w.product_id === productId)).toBeUndefined();

    });

});
