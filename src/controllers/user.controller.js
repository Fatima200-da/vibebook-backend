const prisma = require("../config/prisma");


// =======================
// GET ALL USERS
// =======================

exports.getUsers = async (req, res) => {

    try {

        const {
            page = 1,
            limit = 20,
            sort = "newest"
        } = req.query;


        const orderBy =
            sort === "oldest"
                ? { created_at: "asc" }
                : { created_at: "desc" };


        const users = await prisma.users.findMany({

            orderBy,

            skip: (Number(page) - 1) * Number(limit),

            take: Number(limit),

            select: {

                id: true,
                full_name: true,
                email: true,
                phone: true,
                role: true,
                created_at: true

            }

        });


        const total = await prisma.users.count();


        res.json({

            success: true,

            total,

            page: Number(page),

            limit: Number(limit),

            data: users

        });


    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};



// =======================
// SEARCH USERS
// =======================

exports.searchUsers = async (req, res) => {

    try {

        const {
            q,
            page = 1,
            limit = 20,
            sort = "newest"
        } = req.query;


        const where = {};


        if (q) {

            where.OR = [

                {
                    full_name: {
                        contains: q,
                        mode: "insensitive"
                    }
                },

                {
                    email: {
                        contains: q,
                        mode: "insensitive"
                    }
                },

                {
                    phone: {
                        contains: q,
                        mode: "insensitive"
                    }
                }

            ];

        }


        const users = await prisma.users.findMany({

            where,


            orderBy:
                sort === "oldest"
                    ? { created_at: "asc" }
                    : { created_at: "desc" },


            skip:
                (Number(page) - 1) * Number(limit),


            take:
                Number(limit),


            select: {

                id: true,
                full_name: true,
                email: true,
                phone: true,
                role: true,
                created_at: true

            }

        });



        const total = await prisma.users.count({
            where
        });



        res.json({

            success: true,

            total,

            page: Number(page),

            limit: Number(limit),

            data: users

        });



    } catch (err) {

        console.log(err);


        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};