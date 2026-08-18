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
      pages,
    } = req.body;

    await prisma.albums.update({

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

    // ==========================
    // PAGES / PHOTOS (Designer autosave)
    //
    // Reuses the existing album_pages/photos tables - photos.position is a
    // free-form Json column that already fits {x,y,width,height,rotation}.
    // Every save fully resyncs each page's photos (delete + recreate) rather
    // than diffing individual adds/moves/deletes - simplest correct approach
    // for this phase's scope.
    // ==========================

    if (Array.isArray(pages)) {

      await prisma.$transaction(async (tx) => {

        for (const pageInput of pages) {

          const pageNumber = Number(pageInput.pageNumber);

          if (!pageNumber) continue;

          let pageRecord = await tx.album_pages.findFirst({

            where: {
              album_id: req.params.id,
              page_number: pageNumber,
            },

          });

          if (!pageRecord) {

            pageRecord = await tx.album_pages.create({

              data: {
                album_id: req.params.id,
                page_number: pageNumber,
              },

            });

          }

          await tx.photos.deleteMany({

            where: {
              page_id: pageRecord.id,
            },

          });

          const photosInput = Array.isArray(pageInput.photos)
            ? pageInput.photos
            : [];

          for (const photo of photosInput) {

            const crop = photo.crop && typeof photo.crop === "object"
              ? {
                  x: Number(photo.crop.x) || 0,
                  y: Number(photo.crop.y) || 0,
                  width: Number(photo.crop.width) || 1,
                  height: Number(photo.crop.height) || 1,
                }
              : null;

            await tx.photos.create({

              data: {

                page_id: pageRecord.id,

                url: photo.url || null,

                position: {
                  x: Number(photo.x) || 0,
                  y: Number(photo.y) || 0,
                  width: Number(photo.width) || 0,
                  height: Number(photo.height) || 0,
                  rotation: Number(photo.rotation) || 0,
                  crop,
                  zIndex: Number.isFinite(Number(photo.zIndex)) ? Number(photo.zIndex) : 0,
                  visible: photo.visible !== false,
                  locked: Boolean(photo.locked),
                  name: typeof photo.name === "string" ? photo.name : null,
                  groupId: typeof photo.groupId === "string" ? photo.groupId : null,
                },

              },

            });

          }

          await tx.text_layers.deleteMany({

            where: {
              page_id: pageRecord.id,
            },

          });

          const textsInput = Array.isArray(pageInput.texts)
            ? pageInput.texts
            : [];

          for (const textEl of textsInput) {

            if (typeof textEl.text !== "string") continue;

            await tx.text_layers.create({

              data: {

                page_id: pageRecord.id,

                text: textEl.text,

                style: {
                  x: Number(textEl.x) || 0,
                  y: Number(textEl.y) || 0,
                  width: Number(textEl.width) || 0,
                  height: Number(textEl.height) || 0,
                  rotation: Number(textEl.rotation) || 0,
                  fontFamily: typeof textEl.fontFamily === "string" ? textEl.fontFamily : "outfit",
                  fontSize: Number(textEl.fontSize) || 0,
                  fontWeight: Number(textEl.fontWeight) || 400,
                  color: typeof textEl.color === "string" ? textEl.color : "#111111",
                  textAlign: typeof textEl.textAlign === "string" ? textEl.textAlign : "left",
                  lineHeight: Number(textEl.lineHeight) || 1.4,
                  letterSpacing: Number(textEl.letterSpacing) || 0,
                  zIndex: Number.isFinite(Number(textEl.zIndex)) ? Number(textEl.zIndex) : 0,
                  visible: textEl.visible !== false,
                  locked: Boolean(textEl.locked),
                  name: typeof textEl.name === "string" ? textEl.name : null,
                  groupId: typeof textEl.groupId === "string" ? textEl.groupId : null,
                },

              },

            });

          }

        }

      });

    }

    const album = await prisma.albums.findUnique({

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

    const orderItemCount = await prisma.order_items.count({

      where: {
        album_id: req.params.id,
      },

    });

    if (orderItemCount > 0) {

      return res.status(409).json({

        success: false,

        message: "Bu albom sifarişə bağlıdır və silinə bilməz",
        code: "ALBUM_HAS_ORDERS",

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

    if (req.user.role === "USER" && oldAlbum.user_id !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: "Access denied",

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