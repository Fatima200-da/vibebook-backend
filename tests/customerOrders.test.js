const request = require("supertest");

const app = require("../src/app");
const { DEFAULT_DELIVERY_METHOD, resolveDeliveryFee } = require("../src/config/deliveryMethods");

const defaultDeliveryFee = resolveDeliveryFee(DEFAULT_DELIVERY_METHOD);

describe("Customer Orders API", () => {

    let tokenA;
    let tokenB;
    let productId;
    let productPrice;
    let orderId;
    let albumAId;

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
        productPrice = Number(products.body.data[0].price);

        const album = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ product_id: productId, title: "A's Order Album", total_pages: 10 });

        albumAId = album.body.data.id;

    });

    test("POST /api/orders creates an order and ignores a tampered client price", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                items: [{ product_id: productId, title: "Test Product", price: 0.01, quantity: 2 }],
                shipping_name: "Order A",
                shipping_phone: "0501234567",
                shipping_address: "Baku"
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(Number(response.body.data.total_price)).toBeCloseTo(productPrice * 2 + defaultDeliveryFee);
        expect(Number(response.body.data.order_items[0].price)).toBeCloseTo(productPrice);
        expect(response.body.data.order_items.length).toBe(1);
        expect(response.body.data.delivery_method).toBe(DEFAULT_DELIVERY_METHOD);
        expect(Number(response.body.data.delivery_fee)).toBeCloseTo(defaultDeliveryFee);

        orderId = response.body.data.id;

    });

    test("POST /api/orders ignores a tampered client delivery fee and computes it server-side", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                items: [{ product_id: productId, quantity: 1 }],
                delivery_method: "express",
                delivery_fee: 0.01,
                shipping_name: "Order A", shipping_phone: "0501234567", shipping_address: "Baku"
            });

        const expressFee = resolveDeliveryFee("express");

        expect(response.status).toBe(201);
        expect(Number(response.body.data.delivery_fee)).toBeCloseTo(expressFee);
        expect(Number(response.body.data.total_price)).toBeCloseTo(productPrice + expressFee);

    });

    test("POST /api/orders rejects an unknown delivery method", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                items: [{ product_id: productId, quantity: 1 }],
                delivery_method: "teleport",
                shipping_name: "Order A", shipping_phone: "0501234567", shipping_address: "Baku"
            });

        expect(response.status).toBe(400);

    });

    test("POST /api/orders links a real album owned by the customer", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                items: [{ product_id: productId, album_id: albumAId, quantity: 1 }],
                shipping_name: "Order A", shipping_phone: "0501234567", shipping_address: "Baku"
            });

        expect(response.status).toBe(201);
        expect(response.body.data.order_items[0].album_id).toBe(albumAId);
        expect(response.body.data.order_items[0].title).toBe("A's Order Album");

    });

    test("POST /api/orders rejects an album_id belonging to another customer", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenB}`)
            .send({
                items: [{ product_id: productId, album_id: albumAId, quantity: 1 }],
                shipping_name: "Order B", shipping_phone: "0501234567", shipping_address: "Baku"
            });

        expect(response.status).toBe(403);

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
        expect(responseA.body.total).toBe(3);

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

    test("GET /api/orders/:id includes nested album data for album-linked items", async () => {

        const createResp = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                items: [{ product_id: productId, album_id: albumAId, quantity: 1 }],
                shipping_name: "Order A", shipping_phone: "0501234567", shipping_address: "Baku"
            });

        const response = await request(app)
            .get(`/api/orders/${createResp.body.data.id}`)
            .set("Authorization", `Bearer ${tokenA}`);

        const item = response.body.data.order_items[0];
        expect(item.albums).toBeTruthy();
        expect(item.albums.id).toBe(albumAId);
        expect(item.albums.products).toBeTruthy();

    });

});
