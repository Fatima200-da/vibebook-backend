const prisma = require("../config/prisma");

// Bütün məhsullar
exports.getProducts = async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      include: {
        categories: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};

// Tək məhsul
exports.getProduct = async (req, res) => {
  try {
    const product = await prisma.products.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        categories: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Məhsul tapılmadı.",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};

// Məhsul yarat
exports.createProduct = async (req, res) => {
  try {
    const {
      category_id,
      title,
      description,
      price,
      cover_type,
      min_pages,
      max_pages,
      image,
    } = req.body;

    const product = await prisma.products.create({
      data: {
        category_id,
        title,
        description,
        price: Number(price),
        cover_type,
        min_pages: Number(min_pages),
        max_pages: Number(max_pages),
        image,
      },
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};

// Məhsulu yenilə
// Məhsulu yenilə
exports.updateProduct = async (req, res) => {
  try {
    const {
      category_id,
      title,
      description,
      price,
      cover_type,
      min_pages,
      max_pages,
      image,
    } = req.body;

    const product = await prisma.products.update({
      where: {
        id: req.params.id,
      },
      data: {
        ...(category_id && { category_id }),
        ...(title && { title }),
        ...(description && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(cover_type && { cover_type }),
        ...(min_pages !== undefined && { min_pages: Number(min_pages) }),
        ...(max_pages !== undefined && { max_pages: Number(max_pages) }),
        ...(image && { image }),
      },
    });

    res.json({
      success: true,
      data: product,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};

// Məhsulu sil
exports.deleteProduct = async (req, res) => {
  try {
    await prisma.products.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      success: true,
      message: "Məhsul silindi.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};