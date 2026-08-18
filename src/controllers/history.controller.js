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

                products: true,

                templates: true,

                pages: {

                    orderBy: {
                        page_number: "asc"
                    },

                    include: {
                        photos: true,
                        texts: true
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

        return res.json({

            success: true,
            message: "Undo successful.",
            data: album

        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({

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

                products: true,

                templates: true,

                pages: {

                    orderBy: {
                        page_number: "asc"
                    },

                    include: {
                        photos: true,
                        texts: true
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

        return res.json({

            success: true,
            message: "Redo successful.",
            data: album

        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,
            message: err.message

        });

    }

};