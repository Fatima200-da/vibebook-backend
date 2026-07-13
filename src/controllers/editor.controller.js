const prisma = require("../config/prisma");

// ======================
// GET ALBUM
// ======================

exports.getAlbum = async (req, res) => {
    try {

        const album = await prisma.albums.findUnique({

            where: {
                id: req.params.id
            },

            include: {

                album_pages: {

                    orderBy: {
                        page_number: "asc"
                    },

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
                message: "Album tapılmadı."

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

// ======================
// CREATE PAGE
// ======================

exports.createPage = async (req, res) => {

    try {

        const {
            page_number,
            background
        } = req.body;

        const page = await prisma.album_pages.create({

            data: {

                album_id: req.params.id,
                page_number,
                background

            }

        });

        res.status(201).json({

            success: true,
            data: page

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

// ======================
// DELETE PAGE
// ======================

exports.deletePage = async (req, res) => {

    try {

        await prisma.album_pages.delete({

            where: {
                id: req.params.id
            }

        });

        res.json({

            success: true,
            message: "Page silindi."

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};