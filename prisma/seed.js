const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// products/covers/albums have no natural @unique field to upsert() against,
// so re-running the seed with plain create() calls would duplicate them on
// every run. This finds an existing row by the given lookup first, matching
// the same idempotent intent as the upsert() calls used elsewhere in this
// file.
async function findOrCreate(model, where, data) {
    const existing = await prisma[model].findFirst({ where });
    if (existing) return existing;
    return prisma[model].create({ data });
}

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

    const weddingProduct = await findOrCreate(
        "products",
        { title: "Premium Wedding Album" },
        {

            category_id: weddingCategory.id,

            title: "Premium Wedding Album",

            description: "Luxury Hard Cover Album",

            price: 120,

            cover_type: "Hard",

            min_pages: 20,

            max_pages: 120,

            image: "uploads/products/wedding.jpg"

        }
    );

    const babyProduct = await findOrCreate(
        "products",
        { title: "Baby Memories" },
        {

            category_id: babyCategory.id,

            title: "Baby Memories",

            description: "Baby Photo Album",

            price: 80,

            cover_type: "Soft",

            min_pages: 20,

            max_pages: 80,

            image: "uploads/products/baby.jpg"

        }
    );

    const travelProduct = await findOrCreate(
        "products",
        { title: "Travel Book" },
        {

            category_id: travelCategory.id,

            title: "Travel Book",

            description: "Travel Memories",

            price: 95,

            cover_type: "Hard",

            min_pages: 24,

            max_pages: 100,

            image: "uploads/products/travel.jpg"

        }
    );

    const classicProduct = await findOrCreate(
        "products",
        { title: "Classic Album" },
        {

            category_id: classicCategory.id,

            title: "Classic Album",

            description: "Classic Design",

            price: 70,

            cover_type: "Soft",

            min_pages: 20,

            max_pages: 60,

            image: "uploads/products/classic.jpg"

        }
    );

    console.log("✅ Products created");
       // =========================
       // COVERS
       // =========================
        const cover1 = await findOrCreate("covers", { name: "Luxury White Cover" }, {
                name:"Luxury White Cover",
                image:"uploads/covers/cover1.jpg",
                type:"Hard Cover"
             });
            const cover2 = await findOrCreate("covers", { name: "Classic Black Cover" }, {
                     name:"Classic Black Cover",
                      image:"uploads/covers/cover2.jpg",
                      type:"Soft Cover"
                     });
                    const cover3 = await findOrCreate("covers", { name: "Travel Adventure Cover" }, {
                             name:"Travel Adventure Cover",
                             image:"uploads/covers/cover3.jpg",
                             type:"Premium Cover"
                             });
                            console.log("✅ Covers created");
// =========================
// TEMPLATES
// =========================


const template1 = await prisma.templates.upsert({

    where:{
        name:"Wedding Classic"
    },

    update:{},

    create:{

        name:"Wedding Classic",

        description:
        "Classic wedding album template",

        preview_image:
        "uploads/templates/template1.jpg",

        pages:[
            {
                page:1,
                layout:"cover"
            },
            {
                page:2,
                layout:"photo-text"
            },
            {
                page:3,
                layout:"gallery"
            }
        ]

    }

});



const template2 = await prisma.templates.upsert({

    where:{
        name:"Travel Adventure"
    },

    update:{},

    create:{

        name:"Travel Adventure",

        description:
        "Travel memories album template",

        preview_image:
        "uploads/templates/template2.jpg",

        pages:[
            {
                page:1,
                layout:"cover"
            },
            {
                page:2,
                layout:"full-photo"
            },
            {
                page:3,
                layout:"grid"
            }
        ]

    }

});


console.log("✅ Templates created");
// =========================
// TEST ALBUM
// =========================

const album = await findOrCreate(
    "albums",
    { title: "Demo Wedding Album", user_id: user.id },
    {
        title:"Demo Wedding Album",

        total_pages:20,

        status:"DRAFT",

        users:{
            connect:{
                id:user.id
            }
        },

        products:{
            connect:{
                id:weddingProduct.id
            }
        },

        templates:{
            connect:{
                id:template1.id
            }
        }

    }
);


console.log("✅ Album created");

    // =========================
    // PROMO CODES & GIFT CARDS
    // =========================

    await prisma.promo_codes.upsert({
        where: { code: "VIBE10" },
        update: {},
        create: {
            code: "VIBE10",
            discount_type: "percentage",
            discount_value: 10
        }
    });

    await prisma.promo_codes.upsert({
        where: { code: "SAVE20" },
        update: {},
        create: {
            code: "SAVE20",
            discount_type: "fixed",
            discount_value: 20
        }
    });

    await prisma.promo_codes.upsert({
        where: { code: "WELCOME15" },
        update: {},
        create: {
            code: "WELCOME15",
            discount_type: "percentage",
            discount_value: 15
        }
    });

    await prisma.gift_cards.upsert({
        where: { code: "GIFT25" },
        update: {},
        create: {
            code: "GIFT25",
            initial_balance: 25,
            remaining_balance: 25
        }
    });

    await prisma.gift_cards.upsert({
        where: { code: "GIFT50" },
        update: {},
        create: {
            code: "GIFT50",
            initial_balance: 50,
            remaining_balance: 50
        }
    });

    await prisma.gift_cards.upsert({
        where: { code: "GIFT100" },
        update: {},
        create: {
            code: "GIFT100",
            initial_balance: 100,
            remaining_balance: 100
        }
    });

    console.log("✅ Promo Codes & Gift Cards created");
}

main()
.catch((e)=>{
    console.error(e);
    process.exit(1);
})
.finally(async()=>{
    await prisma.$disconnect();
});