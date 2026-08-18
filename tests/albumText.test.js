const request = require("supertest");

const app = require("../src/app");

describe("Album Text Layers Persistence", () => {

    let token;
    let productId;
    let albumId;

    beforeAll(async () => {

        const email = `album_text_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Text Tester", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        token = login.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        productId = products.body.data[0].id;

        const album = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ product_id: productId, title: "Text Layer Album", total_pages: 2 });

        albumId = album.body.data.id;

    });

    test("Saving a page with texts persists all typography fields", async () => {

        const putResp = await request(app)
            .put(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Text Layer Album",
                pages: [
                    {
                        pageNumber: 1,
                        photos: [],
                        texts: [
                            {
                                text: "Our Wedding Day",
                                x: 20,
                                y: 30,
                                width: 100,
                                height: 12,
                                rotation: 15,
                                fontFamily: "outfit",
                                fontSize: 6,
                                fontWeight: 600,
                                color: "#222222",
                                textAlign: "center",
                                lineHeight: 1.3,
                                letterSpacing: 0.2,
                            },
                        ],
                    },
                ],
            });

        expect(putResp.status).toBe(200);

        const getResp = await request(app)
            .get(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`);

        const page = getResp.body.data.pages.find((p) => p.page_number === 1);
        expect(page.texts).toHaveLength(1);

        const saved = page.texts[0];
        expect(saved.text).toBe("Our Wedding Day");
        expect(saved.style).toMatchObject({
            x: 20,
            y: 30,
            width: 100,
            height: 12,
            rotation: 15,
            fontFamily: "outfit",
            fontSize: 6,
            fontWeight: 600,
            color: "#222222",
            textAlign: "center",
            lineHeight: 1.3,
            letterSpacing: 0.2,
        });

    });

    test("Re-saving a page fully resyncs its texts (delete + recreate)", async () => {

        await request(app)
            .put(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Text Layer Album",
                pages: [{ pageNumber: 1, photos: [], texts: [] }],
            });

        const getResp = await request(app)
            .get(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`);

        const page = getResp.body.data.pages.find((p) => p.page_number === 1);
        expect(page.texts).toHaveLength(0);

    });

    test("Text layers on different pages stay isolated", async () => {

        await request(app)
            .put(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Text Layer Album",
                pages: [
                    { pageNumber: 1, photos: [], texts: [{ text: "Page One Title", x: 0, y: 0, width: 50, height: 10, rotation: 0 }] },
                    { pageNumber: 2, photos: [], texts: [{ text: "Page Two Title", x: 0, y: 0, width: 50, height: 10, rotation: 0 }] },
                ],
            });

        const getResp = await request(app)
            .get(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`);

        const page1 = getResp.body.data.pages.find((p) => p.page_number === 1);
        const page2 = getResp.body.data.pages.find((p) => p.page_number === 2);

        expect(page1.texts).toHaveLength(1);
        expect(page1.texts[0].text).toBe("Page One Title");
        expect(page2.texts).toHaveLength(1);
        expect(page2.texts[0].text).toBe("Page Two Title");

    });

});
