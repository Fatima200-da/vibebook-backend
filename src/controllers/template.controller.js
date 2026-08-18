const prisma = require("../config/prisma");

// ======================================
// CREATE TEMPLATE
// ======================================

exports.createTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      preview_image,
      album_size_key,
      pages,
    } = req.body;

    const template = await prisma.templates.create({
      data: {
        name,
        description,
        preview_image,
        album_size_key,
        pages,
      },
    });

    return res.status(201).json({
      success: true,
      data: template,
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
// GET ALL TEMPLATES
// ======================================

exports.getTemplates = async (req, res) => {
  try {

    const templates = await prisma.templates.findMany({

      orderBy: {
        created_at: "desc",
      },

    });

    return res.json({
      success: true,
      data: templates,
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
// GET TEMPLATE BY ID
// ======================================

exports.getTemplateById = async (req, res) => {

  try {

    const template = await prisma.templates.findUnique({

      where: {
        id: req.params.id,
      },

    });

    if (!template) {

      return res.status(404).json({

        success: false,
        message: "Template tapılmadı",

      });

    }

    return res.json({

      success: true,
      data: template,

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
// UPDATE TEMPLATE
// ======================================

exports.updateTemplate = async (req, res) => {
  try {

    const {
      name,
      description,
      preview_image,
      album_size_key,
      pages,
    } = req.body;

    const existing = await prisma.templates.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Template tapılmadı",
      });
    }

    const template = await prisma.templates.update({
      where: {
        id: req.params.id,
      },
      data: {
        name,
        description,
        preview_image,
        album_size_key,
        pages,
      },
    });

    return res.json({
      success: true,
      data: template,
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
// DELETE TEMPLATE
// ======================================

exports.deleteTemplate = async (req, res) => {
  try {

    const existing = await prisma.templates.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Template tapılmadı",
      });
    }

    const albumCount = await prisma.albums.count({
      where: {
        template_id: req.params.id,
      },
    });

    if (albumCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Bu template istifadə olunduğu üçün silinə bilməz.",
      });
    }

    await prisma.templates.delete({
      where: {
        id: req.params.id,
      },
    });

    return res.json({
      success: true,
      message: "Template uğurla silindi.",
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
// APPLY TEMPLATE TO ALBUM
// ======================================

exports.applyTemplate = async (req, res) => {
  try {

    const { id } = req.params;
    const { album_id } = req.body;

    if (!album_id) {
      return res.status(400).json({
        success: false,
        message: "album_id tələb olunur",
      });
    }

    const template = await prisma.templates.findUnique({
      where: {
        id,
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template tapılmadı",
      });
    }

    const album = await prisma.albums.findUnique({
      where: {
        id: album_id,
      },
    });

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album tapılmadı",
      });
    }

    const templatePages = template.pages || {};

    const pagesCount =
      Number(templatePages.pages) || 0;

    await prisma.$transaction(async (tx) => {

      const oldPages =
        await tx.album_pages.findMany({

          where: {
            album_id,
          },

          select: {
            id: true,
          },

        });

      const pageIds = oldPages.map(
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

      await tx.albums.update({

        where: {
          id: album_id,
        },

        data: {
          template_id: id,
        },

      });

      const elements =
        templatePages.elements || [];
              for (
        let pageNumber = 1;
        pageNumber <= pagesCount;
        pageNumber++
      ) {

        const page = await tx.album_pages.create({

          data: {

            album_id,

            page_number: pageNumber,

            background:
              templatePages.background || null,

          },

        });

        for (const element of elements) {

          if (element.type === "photo") {

            await tx.photos.create({

              data: {

                page_id: page.id,

                url: element.url || "",

                position: {

                  x: element.x || 0,

                  y: element.y || 0,

                  width: element.width || 100,

                  height: element.height || 100,

                  rotation: element.rotation || 0,

                  scale: element.scale || 1,

                  opacity: element.opacity || 1,

                  z_index: element.z_index || 0,

                },

              },

            });

          }

          if (element.type === "text") {

            await tx.text_layers.create({

              data: {

                page_id: page.id,

                text: element.text || "",

                style: {

                  font: element.font || "Arial",

                  color: element.color || "#000000",

                  size: element.size || 20,

                  x: element.x || 0,

                  y: element.y || 0,

                  rotation: element.rotation || 0,

                },

              },

            });

          }

        }

      }

    });

    return res.json({

      success: true,

      message: "Template uğurla tətbiq edildi",

      album_id,

      template_id: id,

      pages_created: pagesCount,

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};