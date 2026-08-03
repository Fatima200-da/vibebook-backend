const prisma = require("../config/prisma");

// ======================================
// CREATE ALBUM
// ======================================

exports.createAlbum = async (req, res) => {

  try {

    const {
      product_id,
      template_id,
      title,
      total_pages,
    } = req.body;

    const album = await prisma.albums.create({

      data: {

        user_id: req.user.id,

        product_id,

        template_id,

        title,

        total_pages: Number(total_pages),

        status: "DRAFT",

      },

    });

    return res.status(201).json({

      success: true,

      data: album,

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

// ======================================
// GET ALL ALBUMS
// ======================================

exports.getAlbums = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const where = {
      title: {
        contains: search,
        mode: "insensitive",
      },
    };

    if (req.user.role === "USER") {
      where.user_id = req.user.id;
    }

    const total = await prisma.albums.count({
      where,
    });

    const albums = await prisma.albums.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        users: true,
        products: true,
        templates: true,
      },
    });

    return res.json({
      success: true,
      data: albums,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// GET ALBUM
// ======================================

exports.getAlbum = async (req, res) => {

  try {

    const album = await prisma.albums.findUnique({

      where: {

        id: req.params.id,

      },

      include: {

        users: true,

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

    if (req.user.role === "USER" && album.user_id !== req.user.id) {

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

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};
// ======================================
// UPDATE ALBUM
// ======================================

exports.updateAlbum = async (req, res) => {

  try {

    const existing = await prisma.albums.findUnique({

      where: {
        id: req.params.id,
      },

    });

    if (!existing) {

      return res.status(404).json({

        success: false,

        message: "Album tapılmadı",

      });

    }

    if (req.user.role === "USER" && existing.user_id !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: "Access denied",

      });

    }

    const {
      product_id,
      template_id,
      title,
      total_pages,
      status,
    } = req.body;

    const album = await prisma.albums.update({

      where: {
        id: req.params.id,
      },

      data: {

        product_id,

        template_id,

        title,

        total_pages: total_pages
          ? Number(total_pages)
          : undefined,

        status,

      },

    });

    return res.json({

      success: true,

      data: album,

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

// ======================================
// DELETE ALBUM
// ======================================

exports.deleteAlbum = async (req, res) => {

  try {

    const existing = await prisma.albums.findUnique({

      where: {
        id: req.params.id,
      },

    });

    if (!existing) {

      return res.status(404).json({

        success: false,

        message: "Album tapılmadı",

      });

    }

    if (req.user.role === "USER" && existing.user_id !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: "Access denied",

      });

    }

    await prisma.$transaction(async (tx) => {

      const pages = await tx.album_pages.findMany({

        where: {
          album_id: req.params.id,
        },

        select: {
          id: true,
        },

      });

      const pageIds = pages.map(
        (page) => page.id
      );

      if (pageIds.length > 0) {

        await tx.photos.deleteMany({

          where: {

            page_id: {
              in: pageIds,
            },

          },

        });

        await tx.text_layers.deleteMany({

          where: {

            page_id: {
              in: pageIds,
            },

          },

        });

        await tx.album_pages.deleteMany({

          where: {

            id: {
              in: pageIds,
            },

          },

        });

      }

      await tx.albums.delete({

        where: {
          id: req.params.id,
        },

      });

    });

    return res.json({

      success: true,

      message: "Album uğurla silindi",

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};
// ======================================
// DUPLICATE ALBUM
// ======================================

exports.duplicateAlbum = async (req, res) => {

  try {

    const oldAlbum = await prisma.albums.findUnique({

      where: {
        id: req.params.id,
      },

      include: {

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

    if (!oldAlbum) {

      return res.status(404).json({

        success: false,

        message: "Album tapılmadı",

      });

    }

    const newAlbum = await prisma.$transaction(async (tx) => {

      const album = await tx.albums.create({

        data: {

          user_id: oldAlbum.user_id,

          product_id: oldAlbum.product_id,

          template_id: oldAlbum.template_id,

          title: `${oldAlbum.title} Copy`,

          total_pages: oldAlbum.total_pages,

          status: "DRAFT",

        },

      });

      for (const page of oldAlbum.pages) {

        const newPage = await tx.album_pages.create({

          data: {

            album_id: album.id,

            page_number: page.page_number,

            background: page.background,

          },

        });

        // ==========================
        // PHOTOS
        // ==========================

        for (const photo of page.photos) {

          await tx.photos.create({

            data: {

              page_id: newPage.id,

              url: photo.url,

              position: photo.position,

            },

          });

        }

        // ==========================
        // TEXTS
        // ==========================

        for (const text of page.texts) {

          await tx.text_layers.create({

            data: {

              page_id: newPage.id,

              text: text.text,

              style: text.style,

            },

          });

        }

      }

      return album;

    });

    return res.json({

      success: true,

      message: "Album uğurla kopyalandı",

      data: newAlbum,

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};
// ======================================
// PREVIEW ALBUM
// ======================================

exports.previewAlbum = async (req, res) => {

  try {

    const album = await prisma.albums.findUnique({

      where: {
        id: req.params.id,
      },

      include: {

        users: true,

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

    if (req.user.role === "USER" && album.user_id !== req.user.id) {

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

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

// ======================================
// UNDO
// ======================================

exports.undoAlbum = async (req, res) => {

  try {

    return res.json({

      success: true,

      message: "Undo hazırdır. History sistemi əlavə ediləcək.",

      albumId: req.params.id,

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

// ======================================
// REDO
// ======================================

exports.redoAlbum = async (req, res) => {

  try {

    return res.json({

      success: true,

      message: "Redo hazırdır. History sistemi əlavə ediləcək.",

      albumId: req.params.id,

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};