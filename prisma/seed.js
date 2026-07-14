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
            data:{
                name:"Luxury White Cover",
                image:"uploads/covers/cover1.jpg",
                type:"Hard Cover"
             }
            });
            const cover2 = await prisma.covers.create({
                data:{
                     name:"Classic Black Cover",
                      image:"uploads/covers/cover2.jpg",
                      type:"Soft Cover"
                     }
                    });
                    const cover3 = await prisma.covers.create({
                        data:{
                             name:"Travel Adventure Cover",
                             image:"uploads/covers/cover3.jpg",
                             type:"Premium Cover"
                             }
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

const album = await prisma.albums.create({

    data:{
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

});


console.log("✅ Album created");
}

main()
.catch((e)=>{
    console.error(e);
    process.exit(1);
})
.finally(async()=>{
    await prisma.$disconnect();
});