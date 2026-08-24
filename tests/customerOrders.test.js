const request = require("supertest");
const crypto = require("crypto");

const app = require("../src/app");
const prisma = require("../src/config/prisma");
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
                shipping_address: "Baku",
                idempotency_key: crypto.randomUUID()
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
                shipping_name: "Order A", shipping_phone: "0501234567", shipping_address: "Baku",
                idempotency_key: crypto.randomUUID()
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
                shipping_name: "Order A", shipping_phone: "0501234567", shipping_address: "Baku",
                idempotency_key: crypto.randomUUID()
            });

        expect(response.status).toBe(400);

    });

    test("POST /api/orders links a real album owned by the customer", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                items: [{ product_id: productId, album_id: albumAId, quantity: 1 }],
                shipping_name: "Order A", shipping_phone: "0501234567", shipping_address: "Baku",
                idempotency_key: crypto.randomUUID()
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
                shipping_name: "Order B", shipping_phone: "0501234567", shipping_address: "Baku",
                idempotency_key: crypto.randomUUID()
            });

        expect(response.status).toBe(403);

    });

    test("POST /api/orders rejects an empty items array", async () => {

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ items: [], idempotency_key: crypto.randomUUID() });

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
                shipping_name: "Order A", shipping_phone: "0501234567", shipping_address: "Baku",
                idempotency_key: crypto.randomUUID()
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

// Phase 26B.1: server-side idempotency protection on order creation.
// Race-safety is enforced by Postgres itself (a real @unique constraint on
// orders.idempotency_key), not an application-level lock - these tests
// prove that guarantee directly, including under real concurrency, rather
// than trusting the design on paper.
describe("Order Creation Idempotency (Phase 26B.1)", () => {

    let token;
    let productId;

    beforeAll(async () => {

        const email = `order_idem_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Idempotency Test", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        token = login.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        productId = products.body.data[0].id;

    });

    test("omitting idempotency_key still creates an order normally (backward compatible)", async () => {

        const before = await prisma.orders.count();

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${token}`)
            .send({ items: [{ product_id: productId, quantity: 1 }] });

        expect(response.status).toBe(201);
        expect(response.body.data.idempotency_key).toBeNull();

        const after = await prisma.orders.count();
        expect(after).toBe(before + 1);

    });

    test("two separate keyless requests each create their own order (no accidental dedup on null)", async () => {

        const before = await prisma.orders.count();

        await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${token}`)
            .send({ items: [{ product_id: productId, quantity: 1 }] });

        await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${token}`)
            .send({ items: [{ product_id: productId, quantity: 1 }] });

        const after = await prisma.orders.count();
        expect(after).toBe(before + 2);

    });

    test("first request with a fresh key creates exactly one order", async () => {

        const key = crypto.randomUUID();

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${token}`)
            .send({ items: [{ product_id: productId, quantity: 1 }], idempotency_key: key });

        expect(response.status).toBe(201);
        expect(response.body.data.idempotency_key).toBe(key);

        const count = await prisma.orders.count({ where: { idempotency_key: key } });
        expect(count).toBe(1);

    });

    test("repeating the same request with the same key does not create a second order", async () => {

        const key = crypto.randomUUID();
        const payload = { items: [{ product_id: productId, quantity: 1 }], idempotency_key: key };

        const first = await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send(payload);
        expect(first.status).toBe(201);

        const second = await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send(payload);
        expect(second.status).toBe(200); // not 201 - this is the "already exists" response, not a new creation
        expect(second.body.data.id).toBe(first.body.data.id);

        const count = await prisma.orders.count({ where: { idempotency_key: key } });
        expect(count).toBe(1);

    });

    test("truly concurrent requests with the same key create exactly one order (real race, not sequential)", async () => {

        const key = crypto.randomUUID();
        const payload = { items: [{ product_id: productId, quantity: 1 }], idempotency_key: key };

        // Fired together, not awaited one at a time - this is what actually
        // exercises the @unique-constraint race path (both requests reach
        // prisma.$transaction before either has committed), unlike the
        // sequential test above which only proves the cheap pre-check works.
        const [respA, respB] = await Promise.all([
            request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send(payload),
            request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send(payload),
        ]);

        const statuses = [respA.status, respB.status].sort();
        // One request wins (201, genuinely created), the other loses the
        // race and gets the already-exists response (200 via the P2002
        // catch path) - both orderings are valid depending on timing.
        expect(statuses).toEqual([200, 201]);

        const winningId = respA.status === 201 ? respA.body.data.id : respB.body.data.id;
        const loserId = respA.status === 201 ? respB.body.data.id : respA.body.data.id;
        expect(loserId).toBe(winningId);

        const count = await prisma.orders.count({ where: { idempotency_key: key } });
        expect(count).toBe(1);

    });

    test("different idempotency keys legitimately create separate orders", async () => {

        const keyOne = crypto.randomUUID();
        const keyTwo = crypto.randomUUID();
        const items = [{ product_id: productId, quantity: 1 }];

        const respOne = await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send({ items, idempotency_key: keyOne });
        const respTwo = await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send({ items, idempotency_key: keyTwo });

        expect(respOne.status).toBe(201);
        expect(respTwo.status).toBe(201);
        expect(respOne.body.data.id).not.toBe(respTwo.body.data.id);

    });

    test("another customer's idempotency key collision is rejected, never returns someone else's order", async () => {

        const emailC = `order_idem_c_${Date.now()}@test.com`;
        await request(app).post("/api/auth/register").send({ full_name: "Idem C", email: emailC, password: "Cust123@" });
        const loginC = await request(app).post("/api/auth/login").send({ email: emailC, password: "Cust123@" });
        const tokenC = loginC.body.token;

        const key = crypto.randomUUID();
        const items = [{ product_id: productId, quantity: 1 }];

        const ownerResp = await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send({ items, idempotency_key: key });
        expect(ownerResp.status).toBe(201);

        // Different customer, same key (guessed or coincidentally reused) -
        // must never be handed the first customer's order.
        const otherResp = await request(app).post("/api/orders").set("Authorization", `Bearer ${tokenC}`).send({ items, idempotency_key: key });
        expect(otherResp.status).toBe(409);
        expect(otherResp.body.success).toBe(false);

    });

    test("a P2002 race does not double-consume a promo code's usage count", async () => {

        const promo = await prisma.promo_codes.upsert({
            where: { code: "IDEMTEST10" },
            update: { used_count: 0, usage_limit: null },
            create: { code: "IDEMTEST10", discount_type: "percentage", discount_value: 10 }
        });

        const key = crypto.randomUUID();
        const payload = {
            items: [{ product_id: productId, quantity: 1 }],
            discount_code: "IDEMTEST10",
            discount_kind: "promo",
            idempotency_key: key
        };

        const [respA, respB] = await Promise.all([
            request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send(payload),
            request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send(payload),
        ]);

        expect([respA.status, respB.status].sort()).toEqual([200, 201]);

        const updatedPromo = await prisma.promo_codes.findUnique({ where: { id: promo.id } });
        // Exactly one order was created for this key, so the promo's
        // used_count must have incremented exactly once - not twice (the
        // loser's whole transaction, including its discount-usage update,
        // rolled back with the P2002 failure).
        expect(updatedPromo.used_count).toBe(1);

    });

});
