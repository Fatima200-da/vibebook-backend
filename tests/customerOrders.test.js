const request = require("supertest");

const app = require("../src/app");

describe("Customer Orders API", () => {

    let tokenA;
    let tokenB;
    let productId;
    let orderId;

    beforeAll(async () => {

        const emailA = `order_a_${Date.now()}@test.com`;
        const emailB = `order_b_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Order A", email: emailA, password: "Cust123@"
        });

        await request(app).post("/api/auth/register").send({
            full_name: "Order B", email: emailB, password: "Cust123@"
        });

        const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password: "Cust123@" });
        const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password: "Cust123@" });

        tokenA = loginA.body.token;
        tokenB = loginB.body.token;

        const products = await request(app).get("/api/public/products?limit=1");

        productId = products.body.data[0].id;

    });

    test("POST /api/orders creates an order with computed total_price", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                items: [{ product_id: productId, title: "Test Product", price: 49.9, quantity: 2 }],
                shipping_name: "Order A",
                shipping_phone: "0501234567",
                shipping_address: "Baku"
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(Number(response.body.data.total_price)).toBeCloseTo(99.8);
        expect(response.body.data.order_items.length).toBe(1);

        orderId = response.body.data.id;

    });

    test("POST /api/orders rejects an empty items array", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ items: [] });

        expect(response.status).toBe(400);

    });

    test("GET /api/orders returns only the logged-in customer's orders", async () => {

        const responseA = await request(app).get("/api/orders").set("Authorization", `Bearer ${tokenA}`);
        const responseB = await request(app).get("/api/orders").set("Authorization", `Bearer ${tokenB}`);

        expect(responseA.status).toBe(200);
        expect(responseA.body.total).toBe(1);

        expect(responseB.status).toBe(200);
        expect(responseB.body.total).toBe(0);

    });

    test("GET /api/orders/:id denies access to another customer's order", async () => {

        const response = await request(app)
            .get(`/api/orders/${orderId}`)
            .set("Authorization", `Bearer ${tokenB}`);

        expect(response.status).toBe(403);

    });

    test("GET /api/orders/:id allows the owner", async () => {

        const response = await request(app)
            .get(`/api/orders/${orderId}`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(orderId);

    });

});
