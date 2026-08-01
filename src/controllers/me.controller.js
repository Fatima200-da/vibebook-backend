const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");

const SAFE_SELECT = {
    id: true,
    full_name: true,
    email: true,
    phone: true,
    role: true,
    created_at: true,
    updated_at: true
};

// =======================
// GET MY PROFILE
// =======================

exports.getMe = async (req, res) => {

    try {

        const user = await prisma.users.findUnique({

            where: {
                id: req.user.id
            },

            select: SAFE_SELECT

        });

        if (!user) {

            return res.status(404).json({

                success: false,
                message: "User not found"

            });

        }

        res.json({

            success: true,
            data: user

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
// UPDATE MY PROFILE
// =======================

exports.updateMe = async (req, res) => {

    try {

        const {
            full_name,
            phone,
            password,
            current_password
        } = req.body;

        const data = {};

        if (full_name !== undefined) data.full_name = full_name;
        if (phone !== undefined) data.phone = phone;

        if (password !== undefined) {

            if (!current_password) {

                return res.status(400).json({

                    success: false,
                    message: "current_password is required to change password"

                });

            }

            const existing = await prisma.users.findUnique({
                where: { id: req.user.id }
            });

            if (!existing) {

                return res.status(404).json({

                    success: false,
                    message: "User not found"

                });

            }

            const match = await bcrypt.compare(current_password, existing.password);

            if (!match) {

                return res.status(400).json({

                    success: false,
                    message: "current_password is incorrect"

                });

            }

            data.password = await bcrypt.hash(password, 10);

        }

        const user = await prisma.users.update({

            where: {
                id: req.user.id
            },

            data,

            select: SAFE_SELECT

        });

        res.json({

            success: true,
            data: user

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};
