const request = require("supertest");

const app = require("../src/app");

// This file intentionally runs with no PAYMENT_* env vars set, to prove the
// "credentials not configured -> never fake success" guard (STEP17).

describe("Payments API - not configured (Phase 18)", () => {

    let tokenA;
    let tokenB;
    let orderId;

    beforeAll(async () => {

        const emailA = `pay_a_${Date.now()}@test.com`;
        const emailB = `pay_b_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Pay A", email: emailA, password: "Cust123@"
        });
        await request(app).post("/api/auth/register").send({
            full_name: "Pay B", email: emailB, password: "Cust123@"
        });

        const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password: "Cust123@" });
        const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password: "Cust123@" });

        tokenA = loginA.body.token;
        tokenB = loginB.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        const productId = products.body.data[0].id;

        const order = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ items: [{ product_id: productId, quantity: 1 }] });

        orderId = order.body.data.id;

    });

    it("rejects payment creation for another customer's order (unauthorized)", async () => {
        const response = await request(app)
            .post("/api/payments/create")
            .set("Authorization", `Bearer ${tokenB}`)
            .send({ orderId });

        expect(response.status).toBe(403);
    });

    it("rejects payment creation for a nonexistent order", async () => {
        const response = await request(app)
            .post("/api/payments/create")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ orderId: "00000000-0000-0000-0000-000000000000" });

        expect(response.status).toBe(404);
    });

    it("returns 503 (never a fake success) when the payment provider is not configured", async () => {
        const response = await request(app)
            .post("/api/payments/create")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ orderId });

        expect(response.status).toBe(503);
        expect(response.body.code).toBe("PAYMENT_NOT_CONFIGURED");
    });

    it("ignores a client-sent amount even while not configured (never ever reads it)", async () => {
        const response = await request(app)
            .post("/api/payments/create")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ orderId, amount: 0.01, price: 0.01, total: 0.01, discount: 9999 });

        // Still 503 for the same reason - the tampered fields are never
        // inspected at all, so they can't change the outcome either way.
        expect(response.status).toBe(503);
    });

    it("rejects the webhook when the provider is not configured", async () => {
        const response = await request(app)
            .post("/api/payments/webhook/epoint")
            .send({ data: "anything", signature: "anything" });

        expect(response.status).toBe(503);
    });

    it("requires authentication to check payment status", async () => {
        const response = await request(app).get("/api/payments/some-id/status");
        expect(response.status).toBe(401);
    });

});
