const request = require("supertest");

const app = require("../src/app");

describe("Album Layer Metadata Persistence (zIndex/visible/locked/name)", () => {

    let token;
    let productId;
    let albumId;

    beforeAll(async () => {

        const email = `album_layers_${Date.now()}@test.com`;

        await request(app).post("/api/auth/register").send({
            full_name: "Layers Tester", email, password: "Cust123@"
        });

        const login = await request(app).post("/api/auth/login").send({ email, password: "Cust123@" });
        token = login.body.token;

        const products = await request(app).get("/api/public/products?limit=1");
        productId = products.body.data[0].id;

        const album = await request(app)
            .post("/api/albums")
            .set("Authorization", `Bearer ${token}`)
            .send({ product_id: productId, title: "Layers Album", total_pages: 1 });

        albumId = album.body.data.id;

    });

    test("Photo and text layer metadata (zIndex/visible/locked/name) round-trips", async () => {

        const putResp = await request(app)
            .put(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Layers Album",
                pages: [
                    {
                        pageNumber: 1,
                        photos: [
                            {
                                url: "uploads/fake.png",
                                x: 0, y: 0, width: 50, height: 50, rotation: 0,
                                zIndex: 0, visible: true, locked: false, name: "Photo 1",
                            },
                        ],
                        texts: [
                            {
                                text: "Hidden Caption",
                                x: 0, y: 60, width: 50, height: 10, rotation: 0,
                                zIndex: 1, visible: false, locked: true, name: "Caption Layer",
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

        expect(page.photos[0].position).toMatchObject({
            zIndex: 0, visible: true, locked: false, name: "Photo 1",
        });

        expect(page.texts[0].style).toMatchObject({
            zIndex: 1, visible: false, locked: true, name: "Caption Layer",
        });

    });

    test("Missing visible/locked/name default sensibly", async () => {

        await request(app)
            .put(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Layers Album",
                pages: [
                    {
                        pageNumber: 1,
                        photos: [{ url: "uploads/fake.png", x: 0, y: 0, width: 50, height: 50, rotation: 0 }],
                        texts: [],
                    },
                ],
            });

        const getResp = await request(app)
            .get(`/api/albums/${albumId}`)
            .set("Authorization", `Bearer ${token}`);

        const page = getResp.body.data.pages.find((p) => p.page_number === 1);
        expect(page.photos[0].position).toMatchObject({ zIndex: 0, visible: true, locked: false, name: null });

    });

});
