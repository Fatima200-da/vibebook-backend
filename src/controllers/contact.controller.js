const prisma = require("../config/prisma");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =======================
// CREATE CONTACT MESSAGE
// =======================

exports.createContactMessage = async (req, res) => {

    try {

        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {

            return res.status(400).json({
                success: false,
                message: "name, email, subject and message are required"
            });

        }

        if (!EMAIL_REGEX.test(email)) {

            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });

        }

        if (String(message).trim().length < 20) {

            return res.status(400).json({
                success: false,
                message: "message must be at least 20 characters"
            });

        }

        const saved = await prisma.contact_messages.create({
            data: { name, email, subject, message }
        });

        res.status(201).json({
            success: true,
            message: "Message received",
            data: saved
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
