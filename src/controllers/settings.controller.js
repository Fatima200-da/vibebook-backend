const prisma = require("../config/prisma");


// =======================
// GET SETTINGS
// =======================

exports.getSettings = async (req, res) => {

    try {

        const settings = await prisma.settings.findFirst();

        res.json({
            success: true,
            data: settings
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
// GET PUBLIC CONTACT INFO
// =======================

exports.getPublicContactInfo = async (req, res) => {

    try {

        const settings = await prisma.settings.findFirst();

        res.json({
            success: true,
            data: settings
                ? {
                    email: settings.email,
                    phone: settings.phone,
                    address: settings.address
                }
                : null
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
// UPDATE SETTINGS
// =======================

exports.updateSettings = async (req, res) => {

    try {

        const {
            company_name,
            phone,
            email,
            address,
            instagram,
            facebook,
            logo,
            favicon,
            primary_color,
            secondary_color
        } = req.body;


        const settings = await prisma.settings.findFirst();

        if (!settings) {

            return res.status(404).json({
                success: false,
                message: "Settings tapılmadı"
            });

        }


        const updated = await prisma.settings.update({

            where: {
                id: settings.id
            },

            data: {
                company_name,
                phone,
                email,
                address,
                instagram,
                facebook,
                logo,
                favicon,
                primary_color,
                secondary_color
            }

        });


        res.json({

            success: true,
            message: "Settings yeniləndi",

            data: updated

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};