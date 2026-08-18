const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

describe("Promo Codes & Gift Cards (Phase 17)", () => {

    let tokenA;
    let tokenB;
    let productId;
    let productPrice;
    let albumAId;

    let expiredPromoCode;
    let usageLimitPromoCode;
    let inactivePromoCode;
    let minOrderPromoCode;
    let expiredGiftCardCode;
    let smallGiftCardCode;
    let concurrencyGiftCardCode;

    beforeAll(async () => {

        const emailA = `promo_a_${Date.now()}@test.com`;
        const emailB = `promo_b_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Promo A", email: emailA, password: "Cust123@"
        });
        await request(app).post("/api/auth/register").send({
            full_name: "Promo B", email: emailB, password: "Cust123@"
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
            .send({ product_id: productId, title: "Promo Test Album", total_pages: 10 });
        albumAId = album.body.data.id;

        const ts = Date.now();

        expiredPromoCode = `ZZZ_P17_EXPIRED_${ts}`;
        usageLimitPromoCode = `ZZZ_P17_USEDUP_${ts}`;
        inactivePromoCode = `ZZZ_P17_INACTIVE_${ts}`;
        minOrderPromoCode = `ZZZ_P17_MINORDER_${ts}`;
        expiredGiftCardCode = `ZZZ_P17_GCEXP_${ts}`;
        smallGiftCardCode = `ZZZ_P17_GCSMALL_${ts}`;
        concurrencyGiftCardCode = `ZZZ_P17_GCCONC_${ts}`;

        await prisma.promo_codes.create({
            data: {
                code: expiredPromoCode, discount_type: "fixed", discount_value: 10,
                expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        });

        await prisma.promo_codes.create({
            data: {
                code: usageLimitPromoCode, discount_type: "fixed", discount_value: 10,
                usage_limit: 1, used_count: 1
            }
        });

        await prisma.promo_codes.create({
            data: {
                code: inactivePromoCode, discount_type: "fixed", discount_value: 10,
                active: false
            }
        });

        await prisma.promo_codes.create({
            data: {
                code: minOrderPromoCode, discount_type: "fixed", discount_value: 5,
                min_order_amount: 999999
            }
        });

        await prisma.gift_cards.create({
            data: {
                code: expiredGiftCardCode, initial_balance: 50, remaining_balance: 50,
                expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        });

        await prisma.gift_cards.create({
            data: {
                code: smallGiftCardCode, initial_balance: 5, remaining_balance: 5
            }
        });

        await prisma.gift_cards.create({
            data: {
                code: concurrencyGiftCardCode, initial_balance: 30, remaining_balance: 30
            }
        });

    });

    afterAll(async () => {

        await prisma.promo_codes.deleteMany({
            where: { code: { in: [expiredPromoCode, usageLimitPromoCode, inactivePromoCode, minOrderPromoCode] } }
        });

        await prisma.gift_cards.deleteMany({
            where: { code: { in: [expiredGiftCardCode, smallGiftCardCode, concurrencyGiftCardCode] } }
        });

        await prisma.$disconnect();

    });

    describe("POST /api/promotions/validate", () => {

        it("validates a real seeded promo code and computes the discount server-side", async () => {
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: "vibe10", kind: "promo", items: [{ product_id: productId, quantity: 2 }] });

            expect(response.status).toBe(200);
            expect(response.body.data.discountAmount).toBeCloseTo(productPrice * 2 * 0.1);
        });

        it("is case-insensitive", async () => {
            const lower = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: "vibe10", kind: "promo", items: [{ product_id: productId, quantity: 1 }] });

            const upper = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: "VIBE10", kind: "promo", items: [{ product_id: productId, quantity: 1 }] });

            const mixed = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: "ViBe10", kind: "promo", items: [{ product_id: productId, quantity: 1 }] });

            expect(lower.body.data.discountAmount).toBeCloseTo(upper.body.data.discountAmount);
            expect(mixed.body.data.discountAmount).toBeCloseTo(upper.body.data.discountAmount);
        });

        it("rejects an invalid/nonexistent promo code", async () => {
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: "DOES_NOT_EXIST_XYZ", kind: "promo", items: [{ product_id: productId, quantity: 1 }] });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("NOT_FOUND");
        });

        it("rejects an expired promo code", async () => {
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: expiredPromoCode, kind: "promo", items: [{ product_id: productId, quantity: 1 }] });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("EXPIRED");
        });

        it("rejects a promo code past its usage limit", async () => {
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: usageLimitPromoCode, kind: "promo", items: [{ product_id: productId, quantity: 1 }] });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("USAGE_LIMIT_REACHED");
        });

        it("rejects an inactive promo code", async () => {
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: inactivePromoCode, kind: "promo", items: [{ product_id: productId, quantity: 1 }] });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("INACTIVE");
        });

        it("rejects a promo code when the order doesn't meet the minimum amount", async () => {
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: minOrderPromoCode, kind: "promo", items: [{ product_id: productId, quantity: 1 }] });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("MIN_ORDER_NOT_MET");
        });

        it("rejects an expired gift card", async () => {
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: expiredGiftCardCode, kind: "giftcard", items: [{ product_id: productId, quantity: 1 }] });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("EXPIRED");
        });

        it("caps a gift card's applied amount at the order total, not the full balance", async () => {
            // smallGiftCardCode balance = 5, order = 1x productPrice (much larger than 5)
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ code: smallGiftCardCode, kind: "giftcard", items: [{ product_id: productId, quantity: 1 }] });

            expect(response.status).toBe(200);
            expect(response.body.data.discountAmount).toBeCloseTo(5);
            expect(response.body.data.remainingBalance).toBeCloseTo(0);
            expect(response.body.data.fullyCovered).toBe(false);
        });

        it("rejects album items that belong to another customer (cross-user manipulation)", async () => {
            const response = await request(app)
                .post("/api/promotions/validate")
                .set("Authorization", `Bearer ${tokenB}`)
                .send({
                    code: "VIBE10", kind: "promo",
                    items: [{ product_id: productId, album_id: albumAId, quantity: 1 }]
                });

            expect(response.status).toBe(403);
        });

    });

    describe("POST /api/orders with discount", () => {

        it("ignores a client-sent discount/total and computes the real total from a valid promo", async () => {
            const response = await request(app)
                .post("/api/orders")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({
                    items: [{ product_id: productId, quantity: 2 }],
                    discount_code: "SAVE20",
                    discount_kind: "promo",
                    // tampered client fields that must be fully ignored
                    discount: 9999,
                    total: 0.01,
                    total_price: 0.01
                });

            const expectedDiscount = 20; // SAVE20 = fixed 20
            const expectedTotal = productPrice * 2 + 5 - expectedDiscount; // + default delivery fee

            expect(response.status).toBe(201);
            expect(Number(response.body.data.discount_amount)).toBeCloseTo(expectedDiscount);
            expect(Number(response.body.data.total_price)).toBeCloseTo(expectedTotal);
            expect(response.body.data.discount_code).toBe("SAVE20");
        });

        it("a client discount of 0 does not suppress the real server-computed discount", async () => {
            const response = await request(app)
                .post("/api/orders")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({
                    items: [{ product_id: productId, quantity: 1 }],
                    discount_code: "WELCOME15",
                    discount_kind: "promo",
                    discount: 0
                });

            expect(response.status).toBe(201);
            expect(Number(response.body.data.discount_amount)).toBeCloseTo(productPrice * 0.15);
        });

        it("rejects order creation with an expired promo code and applies no discount", async () => {
            const response = await request(app)
                .post("/api/orders")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({
                    items: [{ product_id: productId, quantity: 1 }],
                    discount_code: expiredPromoCode,
                    discount_kind: "promo"
                });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("EXPIRED");
        });

        it("increments used_count only when the order is actually created", async () => {
            const before = await prisma.promo_codes.findUnique({ where: { code: "WELCOME15" } });

            const response = await request(app)
                .post("/api/orders")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({
                    items: [{ product_id: productId, quantity: 1 }],
                    discount_code: "WELCOME15",
                    discount_kind: "promo"
                });

            expect(response.status).toBe(201);

            const after = await prisma.promo_codes.findUnique({ where: { code: "WELCOME15" } });
            expect(after.used_count).toBe(before.used_count + 1);
        });

        it("applies a partial gift card and correctly reduces its remaining balance", async () => {
            const giftCode = `ZZZ_P17_PARTIAL_${Date.now()}`;
            await prisma.gift_cards.create({
                data: { code: giftCode, initial_balance: 5, remaining_balance: 5 }
            });

            const response = await request(app)
                .post("/api/orders")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({
                    items: [{ product_id: productId, quantity: 1 }],
                    discount_code: giftCode,
                    discount_kind: "giftcard"
                });

            expect(response.status).toBe(201);
            expect(Number(response.body.data.discount_amount)).toBeCloseTo(5);

            const afterCard = await prisma.gift_cards.findUnique({ where: { code: giftCode } });
            expect(Number(afterCard.remaining_balance)).toBeCloseTo(0);

            await prisma.gift_cards.delete({ where: { code: giftCode } });
        });

        it("fully covers a small order with a larger gift card and leaves the remainder", async () => {
            const giftCode = `ZZZ_P17_FULL_${Date.now()}`;
            await prisma.gift_cards.create({
                data: { code: giftCode, initial_balance: 1000, remaining_balance: 1000 }
            });

            const response = await request(app)
                .post("/api/orders")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({
                    items: [{ product_id: productId, quantity: 1 }],
                    discount_code: giftCode,
                    discount_kind: "giftcard"
                });

            const expectedDiscount = productPrice + 5; // items + default delivery fee

            expect(response.status).toBe(201);
            expect(Number(response.body.data.discount_amount)).toBeCloseTo(expectedDiscount);
            expect(Number(response.body.data.total_price)).toBeCloseTo(0);

            const afterCard = await prisma.gift_cards.findUnique({ where: { code: giftCode } });
            expect(Number(afterCard.remaining_balance)).toBeCloseTo(1000 - expectedDiscount);

            await prisma.gift_cards.delete({ where: { code: giftCode } });
        });

        it("prevents double-spend when two concurrent orders use the same gift card balance", async () => {
            // Balance is exactly enough for ONE order (itemsTotal+deliveryFee < 30),
            // so both concurrent requests will each try to consume the full 30.
            const [resA, resB] = await Promise.all([
                request(app)
                    .post("/api/orders")
                    .set("Authorization", `Bearer ${tokenA}`)
                    .send({
                        items: [{ product_id: productId, quantity: 1 }],
                        discount_code: concurrencyGiftCardCode,
                        discount_kind: "giftcard"
                    }),
                request(app)
                    .post("/api/orders")
                    .set("Authorization", `Bearer ${tokenB}`)
                    .send({
                        items: [{ product_id: productId, quantity: 1 }],
                        discount_code: concurrencyGiftCardCode,
                        discount_kind: "giftcard"
                    })
            ]);

            const statuses = [resA.status, resB.status];
            const successCount = statuses.filter((s) => s === 201).length;
            const rejectedCount = statuses.filter((s) => s === 400 || s === 409).length;

            // Exactly one must succeed and the other must be rejected - the loser
            // may see either a 400 (read-time DEPLETED, if the winner's transaction
            // already committed by the time it reads) or a 409 (write-time race
            // lost in the atomic update) depending on exact interleaving - both are
            // correct rejections. What matters is never both succeeding, which
            // would be a double-spend.
            expect(successCount).toBe(1);
            expect(rejectedCount).toBe(1);

            const card = await prisma.gift_cards.findUnique({ where: { code: concurrencyGiftCardCode } });
            expect(Number(card.remaining_balance)).toBeCloseTo(0);
        });

    });

});
