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

    const anniversaryCategory = await prisma.categories.upsert({
        where: {
            name: "Anniversary"
        },
        update: {},
        create: {
            name: "Anniversary",
            image: "uploads/categories/anniversary.jpg"
        }
    });

    const graduationCategory = await prisma.categories.upsert({
        where: {
            name: "Graduation"
        },
        update: {},
        create: {
            name: "Graduation",
            image: "uploads/categories/graduation.jpg"
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

            image: "uploads/products/wedding.jpg",

            thickness_key: "gold",

            album_size_key: "30x30"

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

            image: "uploads/products/baby.jpg",

            thickness_key: "mini",

            album_size_key: "20x20"

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

            image: "uploads/products/travel.jpg",

            thickness_key: "classic",

            album_size_key: "30x30"

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

            image: "uploads/products/classic.jpg",

            thickness_key: "classic",

            album_size_key: "a4"

        }
    );

    // Additional products (Phase 25 staging QA follow-up) - more variety
    // per category so pagination/search/filter have real data to exercise,
    // matching the existing findOrCreate/title-lookup pattern above so a
    // re-run never duplicates these rows.

    const weddingProduct2 = await findOrCreate(
        "products",
        { title: "Elegant Wedding Story" },
        {
            category_id: weddingCategory.id,
            title: "Elegant Wedding Story",
            description: "Soft-cover wedding album with a modern minimalist layout",
            price: 95,
            cover_type: "Soft",
            min_pages: 20,
            max_pages: 100,
            image: "uploads/products/wedding-elegant.jpg",
            thickness_key: "classic",
            album_size_key: "a4"
        }
    );

    const babyProduct2 = await findOrCreate(
        "products",
        { title: "First Year Journal" },
        {
            category_id: babyCategory.id,
            title: "First Year Journal",
            description: "A month-by-month keepsake album for baby's first year",
            price: 65,
            cover_type: "Soft",
            min_pages: 20,
            max_pages: 60,
            image: "uploads/products/baby-first-year.jpg",
            thickness_key: "mini",
            album_size_key: "20x20"
        }
    );

    const travelProduct2 = await findOrCreate(
        "products",
        { title: "Adventure Diary" },
        {
            category_id: travelCategory.id,
            title: "Adventure Diary",
            description: "Rugged hard-cover album built for road-trip and hiking memories",
            price: 110,
            cover_type: "Hard",
            min_pages: 24,
            max_pages: 120,
            image: "uploads/products/travel-adventure.jpg",
            thickness_key: "gold",
            album_size_key: "30x30"
        }
    );

    const classicProduct2 = await findOrCreate(
        "products",
        { title: "Timeless Collection" },
        {
            category_id: classicCategory.id,
            title: "Timeless Collection",
            description: "Premium hard-cover album with an understated, timeless design",
            price: 150,
            cover_type: "Hard",
            min_pages: 20,
            max_pages: 100,
            image: "uploads/products/classic-timeless.jpg",
            thickness_key: "platinum",
            album_size_key: "a4"
        }
    );

    const anniversaryProduct = await findOrCreate(
        "products",
        { title: "Anniversary Keepsake" },
        {
            category_id: anniversaryCategory.id,
            title: "Anniversary Keepsake",
            description: "A celebratory hard-cover album for marking years together",
            price: 130,
            cover_type: "Hard",
            min_pages: 20,
            max_pages: 100,
            image: "uploads/products/anniversary-keepsake.jpg",
            thickness_key: "gold",
            album_size_key: "30x30"
        }
    );

    const anniversaryProduct2 = await findOrCreate(
        "products",
        { title: "Golden Years" },
        {
            category_id: anniversaryCategory.id,
            title: "Golden Years",
            description: "Soft-cover anniversary album with a warm, classic palette",
            price: 85,
            cover_type: "Soft",
            min_pages: 20,
            max_pages: 60,
            image: "uploads/products/anniversary-golden-years.jpg",
            thickness_key: "classic",
            album_size_key: "20x20"
        }
    );

    const graduationProduct = await findOrCreate(
        "products",
        { title: "Graduation Milestones" },
        {
            category_id: graduationCategory.id,
            title: "Graduation Milestones",
            description: "Hard-cover album celebrating a full academic journey",
            price: 100,
            cover_type: "Hard",
            min_pages: 20,
            max_pages: 80,
            image: "uploads/products/graduation-milestones.jpg",
            thickness_key: "classic",
            album_size_key: "a4"
        }
    );

    const graduationProduct2 = await findOrCreate(
        "products",
        { title: "Class of Memories" },
        {
            category_id: graduationCategory.id,
            title: "Class of Memories",
            description: "Compact soft-cover album for graduation photos and keepsakes",
            price: 60,
            cover_type: "Soft",
            min_pages: 20,
            max_pages: 50,
            image: "uploads/products/graduation-class-of-memories.jpg",
            thickness_key: "mini",
            album_size_key: "20x20"
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