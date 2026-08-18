const request = require("supertest");

const app = require("../src/app");

describe("Album Ownership Scoping", () => {

    let tokenA;
    let tokenB;
    let adminToken;
    let productId;
    let albumId;

    beforeAll(async () => {

        const emailA = `album_a_${Date.now()}@test.com`;
        const emailB = `album_b_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Album A", email: emailA, password: "Cust123@"
        });

        await request(app).post("/api/auth/register").send({
            full_name: "Album B", email: emailB, password: "Cust123@"
        });

        const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password: "Cust123@" });
        const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password: "Cust123@" });
        const adminLogin = await request(app).post("/api/auth/admin/login").send({
            email: "admin@vibebook.az", password: "Admin123@"
        });

        tokenA = loginA.body.token;
        tokenB = loginB.body.token;
        adminToken = adminLogin.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        productId = products.body.data[0].id;

        const album = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ product_id: productId, title: "A's Private Album", total_pages: 20 });

        albumId = album.body.data.id;

    });

    test("Customer A sees their own album in the list", async () => {

        const response = await request(app).get("/api/albums").set("Authorization", `Bearer ${tokenA}`);

        expect(response.body.data.some((a) => a.id === albumId)).toBe(true);

    });

    test("Customer B does not see A's album in the list", async () => {

        const response = await request(app).get("/api/albums").set("Authorization", `Bearer ${tokenB}`);

        expect(response.body.data.some((a) => a.id === albumId)).toBe(false);

    });

    test("Customer B is denied direct access to A's album", async () => {

        const getResp = await request(app).get(`/api/albums/${albumId}`).set("Authorization", `Bearer ${tokenB}`);
        expect(getResp.status).toBe(403);

        const putResp = await request(app)
            .put(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${tokenB}`)
            .send({ title: "Hijacked" });
        expect(putResp.status).toBe(403);

        const deleteResp = await request(app).delete(`/api/albums/${albumId}`).set("Authorization", `Bearer ${tokenB}`);
        expect(deleteResp.status).toBe(403);

    });

    test("Customer A can still access their own album", async () => {

        const response = await request(app).get(`/api/albums/${albumId}`).set("Authorization", `Bearer ${tokenA}`);

        expect(response.status).toBe(200);

    });

    test("Admin still sees all albums, unscoped", async () => {

        const response = await request(app).get("/api/albums").set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.some((a) => a.id === albumId)).toBe(true);

    });

    test("Customer B is denied duplicating A's album (Phase 12)", async () => {

        const response = await request(app)
            .post(`/api/albums/${albumId}/duplicate`)
            .set("Authorization", `Bearer ${tokenB}`);

        expect(response.status).toBe(403);

    });

    test("Customer A can duplicate their own album", async () => {

        const response = await request(app)
            .post(`/api/albums/${albumId}/duplicate`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(response.status).toBe(200);

    });

    describe("Legacy /api/editor + photo/text ownership (Phase 12)", () => {

        let pageId;
        let photoId;
        let textId;

        beforeAll(async () => {

            const saveResp = await request(app)
                .put(`/api/albums/${albumId}`)
                .set("Authorization", `Bearer ${tokenA}`)
                .send({
                    title: "A's Private Album",
                    pages: [
                        {
                            pageNumber: 1,
                            photos: [{ url: "uploads/test.png", x: 1, y: 1, width: 10, height: 10 }],
                            texts: [{ text: "hello", x: 1, y: 1, width: 10, height: 5 }],
                        },
                    ],
                });

            const page = saveResp.body.data.pages[0];
            pageId = page.id;
            photoId = page.photos[0].id;
            textId = page.texts[0].id;

        });

        test("Customer B cannot read A's album via /api/editor/albums/:id", async () => {
            const response = await request(app)
                .get(`/api/editor/albums/${albumId}`)
                .set("Authorization", `Bearer ${tokenB}`);
            expect(response.status).toBe(403);
        });

        test("Customer B cannot read A's album via /api/editor/:id (getEditor)", async () => {
            const response = await request(app)
                .get(`/api/editor/${albumId}`)
                .set("Authorization", `Bearer ${tokenB}`);
            expect(response.status).toBe(403);
        });

        test("Customer B cannot create a page on A's album", async () => {
            const response = await request(app)
                .post(`/api/editor/albums/${albumId}/pages`)
                .set("Authorization", `Bearer ${tokenB}`);
            expect(response.status).toBe(403);
        });

        test("Customer B cannot delete A's page", async () => {
            const response = await request(app)
                .delete(`/api/editor/pages/${pageId}`)
                .set("Authorization", `Bearer ${tokenB}`);
            expect(response.status).toBe(403);
        });

        test("Customer B cannot add/update/delete a photo on A's page", async () => {
            const addResp = await request(app)
                .post(`/api/editor/pages/${pageId}/photos`)
                .set("Authorization", `Bearer ${tokenB}`);
            expect(addResp.status).toBe(403);

            const updateResp = await request(app)
                .put(`/api/editor/photos/${photoId}`)
                .set("Authorization", `Bearer ${tokenB}`)
                .send({ url: "hijacked.png" });
            expect(updateResp.status).toBe(403);

            const deleteResp = await request(app)
                .delete(`/api/editor/photos/${photoId}`)
                .set("Authorization", `Bearer ${tokenB}`);
            expect(deleteResp.status).toBe(403);
        });

        test("Customer B cannot add/update/delete a text layer on A's page", async () => {
            const addResp = await request(app)
                .post(`/api/editor/pages/${pageId}/texts`)
                .set("Authorization", `Bearer ${tokenB}`);
            expect(addResp.status).toBe(403);

            const updateResp = await request(app)
                .put(`/api/editor/texts/${textId}`)
                .set("Authorization", `Bearer ${tokenB}`)
                .send({ text: "hijacked" });
            expect(updateResp.status).toBe(403);

            const deleteResp = await request(app)
                .delete(`/api/editor/texts/${textId}`)
                .set("Authorization", `Bearer ${tokenB}`);
            expect(deleteResp.status).toBe(403);
        });

        test("Customer A (the owner) can still read via /api/editor/albums/:id", async () => {
            const response = await request(app)
                .get(`/api/editor/albums/${albumId}`)
                .set("Authorization", `Bearer ${tokenA}`);
            expect(response.status).toBe(200);
        });

        test("Customer A (the owner) can still update their own photo/text", async () => {
            const updatePhoto = await request(app)
                .put(`/api/editor/photos/${photoId}`)
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ url: "uploads/test.png" });
            expect(updatePhoto.status).toBe(200);

            const updateText = await request(app)
                .put(`/api/editor/texts/${textId}`)
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ text: "still mine" });
            expect(updateText.status).toBe(200);
        });

    });

    describe("Delete protection for order-linked albums (Phase 14)", () => {

        let orderedAlbumId;

        beforeAll(async () => {

            const album = await request(app)
                .post("/api/albums")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ product_id: productId, title: "A's Ordered Album", total_pages: 5 });

            orderedAlbumId = album.body.data.id;

            await request(app)
                .post("/api/orders")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({
                    items: [{ product_id: productId, album_id: orderedAlbumId, quantity: 1 }],
                    shipping_name: "A", shipping_phone: "0501234567", shipping_address: "Baku"
                });

        });

        test("Deleting an album referenced by an order is blocked with 409", async () => {

            const response = await request(app)
                .delete(`/api/albums/${orderedAlbumId}`)
                .set("Authorization", `Bearer ${tokenA}`);

            expect(response.status).toBe(409);
            expect(response.body.code).toBe("ALBUM_HAS_ORDERS");

        });

        test("An album with no orders can still be deleted normally", async () => {

            const album = await request(app)
                .post("/api/albums")
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ product_id: productId, title: "A's Unordered Album", total_pages: 5 });

            const response = await request(app)
                .delete(`/api/albums/${album.body.data.id}`)
                .set("Authorization", `Bearer ${tokenA}`);

            expect(response.status).toBe(200);

        });

    });

});
