const prisma = require("../config/prisma");

// =======================
// GET ALBUM EDITOR
// =======================

exports.getAlbum = async (req, res) => {
    try {
        const { id } = req.params;

        const album = await prisma.albums.findUnique({
            where: {
                id,
            },
            include: {
                products: true,
                templates: true,
                pages: {
                    orderBy: {
                        page_number: "asc",
                    },
                    include: {
                        photos: true,
                        texts: true,
                    },
                },
            },
        });

        if (!album) {
            return res.status(404).json({
                success: false,
                message: "Album tapılmadı",
            });
        }

        return res.json({
            success: true,
            data: album,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =======================
// CREATE PAGE
// =======================

exports.createPage = async (req, res) => {
    try {
        const { id } = req.params;

        const album = await prisma.albums.findUnique({
            where: {
                id,
            },
        });

        if (!album) {
            return res.status(404).json({
                success: false,
                message: "Album tapılmadı",
            });
        }

        const lastPage = await prisma.album_pages.findFirst({
            where: {
                album_id: id,
            },
            orderBy: {
                page_number: "desc",
            },
        });

        const pageNumber = lastPage ? lastPage.page_number + 1 : 1;

        const page = await prisma.album_pages.create({
            data: {
                album_id: id,
                page_number: pageNumber,
                background: "#ffffff",
            },
        });

        return res.json({
            success: true,
            message: "Page yaradıldı",
            data: page,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =======================
// DELETE PAGE
// =======================

exports.deletePage = async (req, res) => {
    try {
        const { id } = req.params;

        // əvvəl page mövcuddurmu?
        const page = await prisma.album_pages.findUnique({
            where: {
                id,
            },
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Page tapılmadı",
            });
        }

        // həmin page-dəki şəkilləri sil
        await prisma.photos.deleteMany({
            where: {
                page_id: id,
            },
        });

        // həmin page-dəki mətnləri sil
        await prisma.text_layers.deleteMany({
            where: {
                page_id: id,
            },
        });

        // page-i sil
        await prisma.album_pages.delete({
            where: {
                id,
            },
        });

        return res.json({
            success: true,
            message: "Page silindi",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};