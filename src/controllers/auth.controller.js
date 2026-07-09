const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


// =======================
// REGISTER
// =======================

exports.register = async (req, res) => {

    try {

        const {
            full_name,
            email,
            phone,
            password
        } = req.body;

        const userExists = await prisma.users.findUnique({

            where: {
                email
            }

        });

        if (userExists) {

            return res.status(400).json({
                success: false,
                message: "Bu email artıq mövcuddur."
            });

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({

            data: {

                full_name,
                email,
                phone,
                password: hashedPassword

            }

        });

        res.status(201).json({

            success: true,
            message: "Qeydiyyat uğurla tamamlandı.",
            data: {
                id: user.id,
                full_name: user.full_name,
                email: user.email
            }

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
// LOGIN
// =======================

exports.login = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        const user = await prisma.users.findUnique({

            where: {
                email
            }

        });

        if (!user) {

            return res.status(401).json({

                success: false,
                message: "Email və ya şifrə yanlışdır."

            });

        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {

            return res.status(401).json({

                success: false,
                message: "Email və ya şifrə yanlışdır."

            });

        }

        const token = jwt.sign(

            {
                id: user.id,
                email: user.email,
                role: user.role
            },

            process.env.JWT_SECRET,

            {
                expiresIn: "7d"
            }

        );

        res.json({

            success: true,
            token,

            user: {

                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role

            }

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};