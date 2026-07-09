const prisma = require("../config/prisma");

// CREATE ALBUM
exports.createAlbum = async (req, res) => {
    try {

        const { product_id, title, total_pages } = req.body;

        const album = await prisma.albums.create({
            data: {
                user_id: req.user.id,
                product_id,
                title,
                total_pages
            }
        });

        res.status(201).json({
            success: true,
            data: album
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
};


// GET ALBUM
exports.getAlbum = async (req, res) => {

    try {

        const album = await prisma.albums.findUnique({

            where: {
                id: req.params.id
            },

            include: {
                album_pages: {
                    include: {
                        photos: true,
                        text_layers: true
                    }
                },
                covers: true,
                templates: true,
                products: true
            }

        });

        if (!album) {

            return res.status(404).json({
                success: false,
                message: "Album tapılmadı"
            });

        }

        res.json({
            success: true,
            data: album
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};


// UPDATE ALBUM
exports.updateAlbum = async (req, res) => {

    try {

        const { title, total_pages, status } = req.body;

        const album = await prisma.albums.update({

            where: {
                id: req.params.id
            },

            data: {
                title,
                total_pages,
                status
            }

        });

        res.json({
            success: true,
            message: "Album yeniləndi",
            data: album
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};


// DELETE ALBUM
exports.deleteAlbum = async (req, res) => {

    try {

        await prisma.albums.delete({

            where: {
                id: req.params.id
            }

        });

        res.json({
            success: true,
            message: "Album silindi"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};