const prisma = require("../config/prisma");

// =======================
// UNDO
// =======================

exports.undo = async (req, res) => {

    try {

        const { albumId } = req.params;

        const album = await prisma.albums.findUnique({

            where: {
                id: albumId
            },

            include: {
                album_pages: {
                    include: {
                        photos: true,
                        text_layers: true
                    },
                    orderBy: {
                        page_number: "asc"
                    }
                }
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
            message: "Undo uğurla icra olundu.",
            data: album

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
// REDO
// =======================

exports.redo = async (req, res) => {

    try {

        const { albumId } = req.params;

        const album = await prisma.albums.findUnique({

            where: {
                id: albumId
            },

            include: {
                album_pages: {
                    include: {
                        photos: true,
                        text_layers: true
                    },
                    orderBy: {
                        page_number: "asc"
                    }
                }
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
            message: "Redo uğurla icra olundu.",
            data: album

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};