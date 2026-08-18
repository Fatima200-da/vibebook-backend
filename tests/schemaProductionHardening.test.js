// Phase 20 STEP7 - proves the deleteOrder fix: previously this threw a raw
// Postgres RESTRICT-constraint 500 for any order with items (i.e. virtually
// every real order, since checkout always creates order_items). Now it
// returns a clean 409 instead of crashing.

const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

describe("Admin order deletion - FK-safe response (Phase 20 STEP7)", () => {

    let adminToken;
    let customerToken;
    let orderId;

    beforeAll(async () => {

        const adminLogin = await request(app).post("/api/auth/admin/login").send({
            email: "admin@vibebook.az", password: "Admin123@"
        });
        adminToken = adminLogin.body.token;

        const email = `schema_hardening_${Date.now()}@test.com`;
        await request(app).post("/api/auth/register").send({ full_name: "Schema QA", email, password: "Cust123@" });
        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        customerToken = login.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        const productId = products.body.data[0].id;

        const order = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({ items: [{ product_id: productId, quantity: 1 }] });

        orderId = order.body.data.id;

    });

    afterAll(async () => {
        await prisma.order_items.deleteMany({ where: { order_id: orderId } });
        await prisma.orders.deleteMany({ where: { id: orderId } });
        await prisma.$disconnect();
    });

    it("returns a clean 409 instead of a raw DB error when the order has items", async () => {

        const response = await request(app)
            .delete(`/api/admin/orders/${orderId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(409);
        expect(response.body.code).toBe("ORDER_HAS_RECORDS");

        // The order must genuinely still exist - the guard ran before any
        // delete was attempted, not after a partial failure.
        const stillExists = await prisma.orders.findUnique({ where: { id: orderId } });
        expect(stillExists).not.toBeNull();

    });

});
