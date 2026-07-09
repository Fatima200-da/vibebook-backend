const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


// =======================
// ADMIN LOGIN
// =======================

exports.login = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Email və şifrə tələb olunur."
            });

        }

        const admin = await prisma.admin_users.findUnique({

            where: {
                email
            }

        });

        if (!admin) {

            return res.status(401).json({
                success: false,
                message: "Email və ya şifrə yanlışdır."
            });

        }

        const match = await bcrypt.compare(password, admin.password);

        if (!match) {

            return res.status(401).json({
                success: false,
                message: "Email və ya şifrə yanlışdır."
            });

        }

        const token = jwt.sign(

            {
                id: admin.id,
                email: admin.email,
                role: admin.role
            },

            process.env.JWT_SECRET,

            {
                expiresIn: "7d"
            }

        );

        res.json({

            success: true,
            token,

            admin: {

                id: admin.id,
                full_name: admin.full_name,
                email: admin.email,
                role: admin.role

            }

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};


// =======================
// ADMIN LOGOUT
// =======================

exports.logout = async (req, res) => {

    res.json({

        success: true,
        message: "Çıxış edildi."

    });

};


// =======================
// ADMIN PROFILE
// =======================

exports.profile = async (req, res) => {

    try {

        const admin = await prisma.admin_users.findUnique({

            where: {
                id: req.user.id
            },

            select: {

                id: true,
                full_name: true,
                email: true,
                role: true

            }

        });

        if (!admin) {

            return res.status(404).json({

                success: false,
                message: "Admin tapılmadı."

            });

        }

        res.json({

            success: true,
            data: admin

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};