const request = require("supertest");

const app = require("../src/app");

describe("Dashboard status-count consistency (Phase 16 regression)", () => {

    let customerToken;
    let adminToken;
    let productId;
    let orderId;

    beforeAll(async () => {

        const email = `dash_customer_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Dashboard Customer", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        customerToken = login.body.token;

        const adminLogin = await request(app).post("/api/auth/admin/login").send({
            email: "admin@vibebook.az", password: "Admin123@"
        });
        adminToken = adminLogin.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        productId = products.body.data[0].id;

        const order = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({ items: [{ product_id: productId, quantity: 1 }] });

        orderId = order.body.data.id;
    });

    it("creates a new order with the same status casing the admin whitelist and dashboard use", async () => {
        const order = await request(app)
            .get(`/api/orders/${orderId}`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(order.body.data.status).toBe("Pending");
    });

    it("reflects a status transition in the matching dashboard counter", async () => {

        const before = await request(app)
            .get("/api/admin/dashboard")
            .set("Authorization", `Bearer ${adminToken}`);

        const preparingBefore = before.body.data.preparingOrders;

        const update = await request(app)
            .put(`/api/admin/orders/${orderId}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "Preparing" });

        expect(update.status).toBe(200);

        const after = await request(app)
            .get("/api/admin/dashboard")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(after.body.data.preparingOrders).toBe(preparingBefore + 1);
    });

});
