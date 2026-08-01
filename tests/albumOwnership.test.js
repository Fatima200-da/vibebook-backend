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

});
