// This file simulates a fully-configured payment provider by mocking the
// Epoint HTTP client and setting PAYMENT_* env vars before anything else
// loads - no real network call ever happens here, and no real credentials
// are used. It proves the security-critical behaviors that only matter once
// the integration is actually active: server-authoritative amount, webhook
// signature verification, idempotency, and amount-mismatch handling.

process.env.PAYMENT_PROVIDER = "epoint";
process.env.PAYMENT_PUBLIC_KEY = "test_public_key";
process.env.PAYMENT_PRIVATE_KEY = "test_private_key_for_jest_only";
process.env.PAYMENT_API_URL = "https://sandbox.example.invalid";
process.env.PAYMENT_RESULT_URL = "http://localhost:5000/api/payments/webhook/epoint";
process.env.PAYMENT_SUCCESS_URL = "http://localhost:5182/payment/return";
process.env.PAYMENT_ERROR_URL = "http://localhost:5182/payment/return";

jest.mock("../src/services/epointClient", () => {
    const actual = jest.requireActual("../src/services/epointClient");
    return {
        ...actual,
        createPayment: jest.fn()
    };
});

const request = require("supertest");
const crypto = require("crypto");

const app = require("../src/app");
const prisma = require("../src/config/prisma");
const epointClient = require("../src/services/epointClient");

function signPayload(payload) {
    const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const signature = crypto
        .createHash("sha1")
        .update(process.env.PAYMENT_PRIVATE_KEY + data + process.env.PAYMENT_PRIVATE_KEY, "utf8")
        .digest("base64");
    return { data, signature };
}

describe("Payments API - configured (Phase 18, mocked provider)", () => {

    let token;
    let productPrice;
    let productId;

    beforeAll(async () => {

        const email = `pay_conf_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Pay Configured", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        token = login.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        productId = products.body.data[0].id;
        productPrice = Number(products.body.data[0].price);

    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    async function createTestOrder() {
        const order = await request(app)
            .post("/api/orders")
            .set("Authorization", `Bearer ${token}`)
            .send({ items: [{ product_id: productId, quantity: 1 }] });
        return order.body.data;
    }

    it("ignores a client-sent amount and always charges order.total_price", async () => {

        const order = await createTestOrder();
        const expectedAmount = Number(order.total_price);

        epointClient.createPayment.mockResolvedValueOnce({
            httpStatus: 200,
            body: { status: "success", redirect_url: "https://bank.example/pay/1", transaction: `te_${Date.now()}` }
        });

        const response = await request(app)
            .post("/api/payments/create")
            .set("Authorization", `Bearer ${token}`)
            .send({ orderId: order.id, amount: 0.01, price: 0.01, total: 0.01 });

        expect(response.status).toBe(201);

        const callArgs = epointClient.createPayment.mock.calls[0][0];
        expect(callArgs.amount).toBeCloseTo(expectedAmount);
        expect(callArgs.amount).not.toBeCloseTo(0.01);

        const payment = await prisma.payments.findUnique({ where: { id: response.body.data.paymentId } });
        expect(Number(payment.amount)).toBeCloseTo(expectedAmount);
        expect(payment.status).toBe("PENDING");

    });

    it("blocks creating a second payment for an already-paid order", async () => {

        const order = await createTestOrder();

        epointClient.createPayment.mockResolvedValueOnce({
            httpStatus: 200,
            body: { status: "success", redirect_url: "https://bank.example/pay/2", transaction: `te_${Date.now()}` }
        });

        const first = await request(app)
            .post("/api/payments/create")
            .set("Authorization", `Bearer ${token}`)
            .send({ orderId: order.id });

        // Simulate the webhook confirming this payment as PAID.
        await prisma.payments.update({
            where: { id: first.body.data.paymentId },
            data: { status: "PAID" }
        });

        const second = await request(app)
            .post("/api/payments/create")
            .set("Authorization", `Bearer ${token}`)
            .send({ orderId: order.id });

        expect(second.status).toBe(409);
        expect(second.body.code).toBe("ALREADY_PAID");

    });

    describe("webhook", () => {

        async function createPendingPayment(amount) {
            const order = await createTestOrder();

            const payment = await prisma.payments.create({
                data: {
                    order_id: order.id,
                    amount: amount ?? Number(order.total_price),
                    currency: "AZN",
                    status: "PENDING",
                    provider: "epoint"
                }
            });

            return payment;
        }

        it("rejects a webhook with an invalid signature and leaves the payment unchanged", async () => {

            const payment = await createPendingPayment();

            const { data } = signPayload({ order_id: payment.id, status: "success", amount: String(payment.amount) });

            const response = await request(app)
                .post("/api/payments/webhook/epoint")
                .type("form")
                .send({ data, signature: "not-a-real-signature" });

            expect(response.status).toBe(401);

            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PENDING");

        });

        it("marks a payment PAID on a valid success callback", async () => {

            const payment = await createPendingPayment();
            const transactionId = `te_webhook_${Date.now()}_success`;

            const { data, signature } = signPayload({
                order_id: payment.id,
                status: "success",
                amount: String(payment.amount),
                transaction: transactionId
            });

            const response = await request(app)
                .post("/api/payments/webhook/epoint")
                .type("form")
                .send({ data, signature });

            expect(response.status).toBe(200);

            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PAID");
            expect(after.provider_transaction_id).toBe(transactionId);

        });

        it("does not process a duplicate webhook for an already-PAID payment (idempotency)", async () => {

            const payment = await createPendingPayment();

            const { data, signature } = signPayload({
                order_id: payment.id,
                status: "success",
                amount: String(payment.amount),
                transaction: `te_webhook_${Date.now()}_dup`
            });

            const first = await request(app)
                .post("/api/payments/webhook/epoint")
                .type("form")
                .send({ data, signature });

            expect(first.status).toBe(200);

            const second = await request(app)
                .post("/api/payments/webhook/epoint")
                .type("form")
                .send({ data, signature });

            expect(second.status).toBe(200);
            expect(second.body.message).toBe("Already processed");

            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PAID");

        });

        it("does not mark a payment PAID when the callback amount does not match", async () => {

            const payment = await createPendingPayment(100);

            const { data, signature } = signPayload({
                order_id: payment.id,
                status: "success",
                amount: "0.01",
                transaction: `te_webhook_${Date.now()}_wrong_amount`
            });

            const response = await request(app)
                .post("/api/payments/webhook/epoint")
                .type("form")
                .send({ data, signature });

            expect(response.status).toBe(200);

            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("PENDING");

        });

        it("marks a payment FAILED on a failed callback", async () => {

            const payment = await createPendingPayment();

            const { data, signature } = signPayload({
                order_id: payment.id,
                status: "failed",
                amount: String(payment.amount),
                transaction: `te_webhook_${Date.now()}_failed`
            });

            const response = await request(app)
                .post("/api/payments/webhook/epoint")
                .type("form")
                .send({ data, signature });

            expect(response.status).toBe(200);

            const after = await prisma.payments.findUnique({ where: { id: payment.id } });
            expect(after.status).toBe("FAILED");

        });

        it("rejects a webhook for a payment that does not exist", async () => {

            const { data, signature } = signPayload({
                order_id: "00000000-0000-0000-0000-000000000000",
                status: "success",
                amount: "10"
            });

            const response = await request(app)
                .post("/api/payments/webhook/epoint")
                .type("form")
                .send({ data, signature });

            expect(response.status).toBe(404);

        });

    });

});
