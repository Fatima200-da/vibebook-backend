const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {

    console.log("🌱 Seeding database...");

    // =========================
    // ADMIN
    // =========================

    const adminPassword = await bcrypt.hash("Admin123@", 10);

    const admin = await prisma.admin_users.upsert({

        where: {
            email: "admin@vibebook.az"
        },

        update: {},

        create: {

            full_name: "Super Admin",

            email: "admin@vibebook.az",

            password: adminPassword,

            role: "SUPER_ADMIN"

        }

    });

    console.log("✅ Admin created");


    // =========================
    // TEST USER
    // =========================

    const userPassword = await bcrypt.hash("User123@", 10);

    const user = await prisma.users.upsert({

        where: {
            email: "test@vibebook.az"
        },

        update: {},

        create: {

            full_name: "Test User",

            email: "test@vibebook.az",

            phone: "0501234567",

            password: userPassword,

            role: "USER"

        }

    });

    console.log("✅ Test User created");
        // =========================
    // CATEGORIES
    // =========================

    const weddingCategory = await prisma.categories.upsert({
        where: {
            name: "Wedding"
        },
        update: {},
        create: {
            name: "Wedding",
            image: "uploads/categories/wedding.jpg"
        }
    });

    const babyCategory = await prisma.categories.upsert({
        where: {
            name: "Baby"
        },
        update: {},
        create: {
            name: "Baby",
            image: "uploads/categories/baby.jpg"
        }
    });

    const travelCategory = await prisma.categories.upsert({
        where: {
            name: "Travel"
        },
        update: {},
        create: {
            name: "Travel",
            image: "uploads/categories/travel.jpg"
        }
    });

    const classicCategory = await prisma.categories.upsert({
        where: {
            name: "Classic"
        },
        update: {},
        create: {
            name: "Classic",
            image: "uploads/categories/classic.jpg"
        }
    });

    console.log("✅ Categories created");

    // =========================
    // PRODUCTS
    // =========================

    const weddingProduct = await prisma.products.create({

        data: {

            category_id: weddingCategory.id,

            title: "Premium Wedding Album",

            description: "Luxury Hard Cover Album",

            price: 120,

            cover_type: "Hard",

            min_pages: 20,

            max_pages: 120,

            image: "uploads/products/wedding.jpg"

        }

    });

    const babyProduct = await prisma.products.create({

        data: {

            category_id: babyCategory.id,

            title: "Baby Memories",

            description: "Baby Photo Album",

            price: 80,

            cover_type: "Soft",

            min_pages: 20,

            max_pages: 80,

            image: "uploads/products/baby.jpg"

        }

    });

    const travelProduct = await prisma.products.create({

        data: {

            category_id: travelCategory.id,

            title: "Travel Book",

            description: "Travel Memories",

            price: 95,

            cover_type: "Hard",

            min_pages: 24,

            max_pages: 100,

            image: "uploads/products/travel.jpg"

        }

    });

    const classicProduct = await prisma.products.create({

        data: {

            category_id: classicCategory.id,

            title: "Classic Album",

            description: "Classic Design",

            price: 70,

            cover_type: "Soft",

            min_pages: 20,

            max_pages: 60,

            image: "uploads/products/classic.jpg"

        }

    });

    console.log("✅ Products created");
        // =========================
    // COVERS
    // =========================

    const cover1 = await prisma.covers.create({
        data: {
            product_id: weddingProduct.id,
            title: "Luxury White Cover",
            image: "uploads/covers/cover1.jpg"
        }
    });

    const cover2 = await prisma.covers.create({
        data: {
            product_id: babyProduct.id,
            title: "Baby Blue Cover",
            image: "uploads/covers/cover2.jpg"
        }
    });

    const cover3 = await prisma.covers.create({
        data: {
            product_id: travelProduct.id,
            title: "Travel Adventure Cover",
            image: "uploads/covers/cover3.jpg"
        }
    });

    const cover4 = await prisma.covers.create({
        data: {
            product_id: classicProduct.id,
            title: "Classic Black Cover",
            image: "uploads/covers/cover4.jpg"
        }
    });

    const cover5 = await prisma.covers.create({
        data: {
            product_id: weddingProduct.id,
            title: "Golden Wedding Cover",
            image: "uploads/covers/cover5.jpg"
        }
    });

    console.log("✅ Covers created");

    // =========================
    // TEMPLATES
    // =========================

    const template1 = await prisma.templates.create({
        data: {
            product_id: weddingProduct.id,
            title: "Wedding Classic",
            thumbnail: "uploads/templates/template1.jpg",
            json_data: {}
        }
    });

    const template2 = await prisma.templates.create({
        data: {
            product_id: babyProduct.id,
            title: "Baby Cute",
            thumbnail: "uploads/templates/template2.jpg",
            json_data: {}
        }
    });

    const template3 = await prisma.templates.create({
        data: {
            product_id: travelProduct.id,
            title: "Travel Story",
            thumbnail: "uploads/templates/template3.jpg",
            json_data: {}
        }
    });

    const template4 = await prisma.templates.create({
        data: {
            product_id: classicProduct.id,
            title: "Classic Memories",
            thumbnail: "uploads/templates/template4.jpg",
            json_data: {}
        }
    });

    const template5 = await prisma.templates.create({
        data: {
            product_id: weddingProduct.id,
            title: "Luxury Wedding",
            thumbnail: "uploads/templates/template5.jpg",
            json_data: {}
        }
    });

    console.log("✅ Templates created");

    // =========================
    // TEST ALBUM
    // =========================

    const album = await prisma.albums.create({
        data: {
            user_id: user.id,
            product_id: weddingProduct.id,
            cover_id: cover1.id,
            template_id: template1.id,
            title: "Demo Wedding Album",
            total_pages: 20,
            status: "Draft"
        }
    });

    console.log("✅ Test Album created");

}

main()
    .then(async () => {

        console.log("🌱 Database seeded successfully.");

        await prisma.$disconnect();

    })
    .catch(async (e) => {

        console.error(e);

        await prisma.$disconnect();

        process.exit(1);

    });