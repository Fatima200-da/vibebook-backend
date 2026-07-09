const prisma = require("../config/prisma");

// Bütün kateqoriyalar
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        products: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.json({
      success: true,
      data: categories,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};


// Tək kateqoriya
exports.getCategory = async (req, res) => {
  try {
    const category = await prisma.categories.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        products: true,
      },
    });


    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kateqoriya tapılmadı",
      });
    }


    res.json({
      success: true,
      data: category,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};


// Kateqoriya yarat
exports.createCategory = async (req, res) => {
  try {

    const {
      name,
      image
    } = req.body;


    const category = await prisma.categories.create({
      data: {
        name,
        image,
      },
    });


    res.status(201).json({
      success: true,
      data: category,
    });


  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};


// Kateqoriya yenilə
exports.updateCategory = async (req, res) => {
  try {

    const {
      name,
      image
    } = req.body;


    const category = await prisma.categories.update({
      where: {
        id: req.params.id,
      },

      data: {
        ...(name && { name }),
        ...(image && { image }),
      },
    });


    res.json({
      success: true,
      data: category,
    });


  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};


// Kateqoriya sil
exports.deleteCategory = async (req, res) => {
  try {

    await prisma.categories.delete({
      where: {
        id: req.params.id,
      },
    });


    res.json({
      success: true,
      message: "Kateqoriya silindi",
    });


  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};