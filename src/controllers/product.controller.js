const prisma = require("../config/prisma");

// =======================
// GET ALL PRODUCTS
// =======================

exports.getProducts = async (req, res) => {
    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { category, priceFrom, priceTo, sort } = req.query;

        const where = {};

        if (category) {
            where.category_id = category;
        }

        if (priceFrom || priceTo) {
            where.price = {};

            if (priceFrom) where.price.gte = Number(priceFrom);
            if (priceTo) where.price.lte = Number(priceTo);
        }

        let orderBy = { created_at: "desc" };

        if (sort === "oldest") orderBy = { created_at: "asc" };
        if (sort === "priceAsc") orderBy = { price: "asc" };
        if (sort === "priceDesc") orderBy = { price: "desc" };

        const total = await prisma.products.count({ where });

        const products = await prisma.products.findMany({
            where,
            include: {
                categories: true
            },
            skip,
            take: limit,
            orderBy
        });

        res.json({
            success: true,
            total,
            page,
            limit,
            data: products
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
// GET PRODUCT BY ID
// =======================

exports.getProduct = async (req, res) => {
    try {

        const product = await prisma.products.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                categories: true
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı."
            });
        }

        res.json({
            success: true,
            data: product
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
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
} = req.body;


const image = req.file
    ? `uploads/${req.file.filename}`
    : null;

    const product = await prisma.products.update({
    where: {
        id: req.params.id
    },
    data: {
        category_id,
        title,
        description,
        price: Number(price),
        cover_type,
        min_pages: Number(min_pages),
        max_pages: Number(max_pages),
        ...(image && { image })
    }
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
// =======================
// SEARCH + FILTER + SORT + PAGINATION
// =======================

exports.searchProducts = async (req, res) => {

    try {

        const {
            q,
            page = 1,
            limit = 20,
            category,
            priceFrom,
            priceTo,
            sort = "newest"
        } = req.query;

        const where = {};

        if (q) {

            where.title = {
                contains: q,
                mode: "insensitive"
            };

        }

        if (category) {

            where.categories = {
                name: category
            };

        }

        if (priceFrom || priceTo) {

            where.price = {};

            if (priceFrom)
                where.price.gte = Number(priceFrom);

            if (priceTo)
                where.price.lte = Number(priceTo);

        }

        let orderBy = {
            created_at: "desc"
        };

        if (sort === "oldest")
            orderBy = { created_at: "asc" };

        if (sort === "priceAsc")
            orderBy = { price: "asc" };

        if (sort === "priceDesc")
            orderBy = { price: "desc" };

        const products = await prisma.products.findMany({

            where,

            include: {
                categories: true
            },

            orderBy,

            skip: (Number(page) - 1) * Number(limit),

            take: Number(limit)

        });

        const total = await prisma.products.count({
            where
        });

        res.json({

            success: true,

            total,

            page: Number(page),

            limit: Number(limit),

            data: products

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};
