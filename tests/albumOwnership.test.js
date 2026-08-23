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
        let bPageId;

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

            // A real page owned by B, so the "A tries to move a photo onto
            // a page A doesn't own" test targets an actual attack scenario
            // rather than a merely-nonexistent id.
            const bAlbum = await request(app)
                .post("/api/albums")
                .set("Authorization", `Bearer ${tokenB}`)
                .send({ title: "B's Private Album", total_pages: 20 });

            const bSaveResp = await request(app)
                .put(`/api/albums/${bAlbum.body.data.id}`)
                .set("Authorization", `Bearer ${tokenB}`)
                .send({ title: "B's Private Album", pages: [{ pageNumber: 1, photos: [], texts: [] }] });

            bPageId = bSaveResp.body.data.pages[0].id;

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

        // Phase 25D: this endpoint previously threw a raw Prisma 500 for
        // EVERY caller (including the rightful owner) because it wrote
        // fields the photos table no longer has. The 403 test above only
        // ever exercised the ownership-check short-circuit, so it never
        // caught this - the request never got far enough to reach the
        // broken prisma.photos.create() call. This test proves the
        // authorized path actually works now, against the real schema.
        test("Customer A can successfully add a photo to A's own page", async () => {

            const response = await request(app)
                .post(`/api/editor/pages/${pageId}/photos`)
                .set("Authorization", `Bearer ${tokenA}`)
                .send({ url: "uploads/test-add-photo.jpg", x: 5, y: 5, width: 50, height: 60, rotation: 0 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.page_id).toBe(pageId);
            expect(response.body.data.url).toBe("uploads/test-add-photo.jpg");
            expect(response.body.data.position).toEqual(
                expect.objectContaining({ x: 5, y: 5, width: 50, height: 60, rotation: 0 })
            );

            // No Prisma internals in a successful response either.
            const raw = JSON.stringify(response.body);
            expect(raw).not.toMatch(/prisma\./i);
            expect(raw).not.toMatch(/Unknown argument/i);

        });

        // Phase 25D.1: updatePhoto used `data: req.body` directly - a pure
        // mass-assignment hole. Any field the caller sent reached Prisma
        // unfiltered, including page_id, which would have let the owner of
        // a photo reassign it onto any page id at all - the ownership
        // check only ever validated the photo being updated, never the
        // destination the request tried to move it to.
        describe("updatePhoto mass-assignment hardening", () => {

            test("Customer A can update legitimate fields (url, position) on A's own photo", async () => {

                const response = await request(app)
                    .put(`/api/editor/photos/${photoId}`)
                    .set("Authorization", `Bearer ${tokenA}`)
                    .send({ url: "uploads/updated.png", x: 42, y: 43, width: 99, height: 88, rotation: 15 });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.url).toBe("uploads/updated.png");
                expect(response.body.data.position).toEqual(
                    expect.objectContaining({ x: 42, y: 43, width: 99, height: 88, rotation: 15 })
                );

            });

            test("A partial position update merges onto the existing position instead of wiping it", async () => {

                // Establish a known baseline with several position fields set.
                await request(app)
                    .put(`/api/editor/photos/${photoId}`)
                    .set("Authorization", `Bearer ${tokenA}`)
                    .send({ x: 10, y: 10, width: 20, height: 20, name: "baseline-name", locked: true });

                // Now send only x/y, as a drag operation would.
                const response = await request(app)
                    .put(`/api/editor/photos/${photoId}`)
                    .set("Authorization", `Bearer ${tokenA}`)
                    .send({ x: 55, y: 60 });

                expect(response.status).toBe(200);
                expect(response.body.data.position).toEqual(
                    expect.objectContaining({
                        x: 55, y: 60,
                        width: 20, height: 20,             // untouched by this request
                        name: "baseline-name", locked: true, // untouched by this request
                    })
                );

            });

            test("Customer A cannot change the photo's page_id, even to a page A does not own - rejected with 400", async () => {

                const response = await request(app)
                    .put(`/api/editor/photos/${photoId}`)
                    .set("Authorization", `Bearer ${tokenA}`)
                    .send({ page_id: bPageId });

                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);

                // Confirm the DB record actually still belongs to its
                // original page - not just that the request was rejected.
                const check = await request(app)
                    .put(`/api/editor/photos/${photoId}`)
                    .set("Authorization", `Bearer ${tokenA}`)
                    .send({ x: 1 });
                expect(check.body.data.page_id).toBe(pageId);

            });

            test("Customer A cannot inject ownership/system fields through the update payload - rejected with 400", async () => {

                const response = await request(app)
                    .put(`/api/editor/photos/${photoId}`)
                    .set("Authorization", `Bearer ${tokenA}`)
                    .send({ user_id: "some-other-user-id", album_id: "some-other-album-id", owner_id: "x" });

                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);

            });

            test("Customer B still cannot update A's photo at all, regardless of payload", async () => {

                const response = await request(app)
                    .put(`/api/editor/photos/${photoId}`)
                    .set("Authorization", `Bearer ${tokenB}`)
                    .send({ url: "hijacked-again.png" });

                expect(response.status).toBe(403);

            });

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
