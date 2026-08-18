const prisma = require("../config/prisma");

// Same ownership rule as album.controller.js (USER role must own the album;
// ADMIN/SUPER_ADMIN unrestricted) - this legacy /api/editor/* surface reads
// and mutates album pages/photos/texts directly by id, so it needs the exact
// same guard the main album routes already enforce.
function isDenied(album, req) {
    return req.user.role === "USER" && album.user_id !== req.user.id;
}

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

        if (isDenied(album, req)) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
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

        if (isDenied(album, req)) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
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
            include: {
                album: true,
            },
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Page tapılmadı",
            });
        }

        if (isDenied(page.album, req)) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
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
exports.getEditor = async (req, res) => {

  try {

    const { id } = req.params;

    const album = await prisma.albums.findUnique({
      where: { id },
    });

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album tapılmadı",
      });
    }

    if (isDenied(album, req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const page =
      await prisma.album_pages.findFirst({

        where: {
          album_id: id,
        },

        include: {
          photos: true,
          text_layers: true,
        },

      });

    if (!page) {

      return res.json({
        success: true,
        data: {
          elements: [],
        },
      });

    }

    const elements = [];

    page.photos.forEach(photo => {

      elements.push({

        id: photo.id,

        type: "photo",

        url: photo.url,

        ...photo.position,

      });

    });

    page.text_layers.forEach(text => {

      elements.push({

        id: text.id,

        type: "text",

        text: text.text,

        ...text.style,

      });

    });

    return res.json({

      success: true,

      data: {

        elements,

      },

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};