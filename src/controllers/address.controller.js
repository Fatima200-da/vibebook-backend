const prisma = require("../config/prisma");

// =======================
// GET MY ADDRESSES
// =======================

exports.getMyAddresses = async (req, res) => {

    try {

        const addresses = await prisma.addresses.findMany({
            where: { user_id: req.user.id },
            orderBy: [
                { is_default: "desc" },
                { created_at: "desc" }
            ]
        });

        res.json({
            success: true,
            data: addresses
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
// CREATE ADDRESS
// =======================

exports.createAddress = async (req, res) => {

    try {

        const { label, full_name, phone, address_line, is_default } = req.body;

        if (!full_name || !phone || !address_line) {

            return res.status(400).json({
                success: false,
                message: "full_name, phone and address_line are required"
            });

        }

        if (is_default) {

            await prisma.addresses.updateMany({
                where: { user_id: req.user.id },
                data: { is_default: false }
            });

        }

        const address = await prisma.addresses.create({
            data: {
                user_id: req.user.id,
                label,
                full_name,
                phone,
                address_line,
                is_default: Boolean(is_default)
            }
        });

        res.status(201).json({
            success: true,
            data: address
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
// UPDATE ADDRESS
// =======================

exports.updateAddress = async (req, res) => {

    try {

        const existing = await prisma.addresses.findUnique({
            where: { id: req.params.id }
        });

        if (!existing) {

            return res.status(404).json({
                success: false,
                message: "Address not found"
            });

        }

        if (existing.user_id !== req.user.id) {

            return res.status(403).json({
                success: false,
                message: "Access denied"
            });

        }

        const { label, full_name, phone, address_line, is_default } = req.body;

        if (is_default) {

            await prisma.addresses.updateMany({
                where: { user_id: req.user.id, NOT: { id: existing.id } },
                data: { is_default: false }
            });

        }

        const updated = await prisma.addresses.update({
            where: { id: existing.id },
            data: {
                label,
                full_name,
                phone,
                address_line,
                is_default: is_default !== undefined ? Boolean(is_default) : undefined
            }
        });

        res.json({
            success: true,
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


// =======================
// DELETE ADDRESS
// =======================

exports.deleteAddress = async (req, res) => {

    try {

        const existing = await prisma.addresses.findUnique({
            where: { id: req.params.id }
        });

        if (!existing) {

            return res.status(404).json({
                success: false,
                message: "Address not found"
            });

        }

        if (existing.user_id !== req.user.id) {

            return res.status(403).json({
                success: false,
                message: "Access denied"
            });

        }

        await prisma.addresses.delete({
            where: { id: existing.id }
        });

        res.json({
            success: true,
            message: "Address deleted"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
