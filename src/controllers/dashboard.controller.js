const prisma = require("../config/prisma");

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalProducts,
      totalCategories,
      totalOrders,
      pendingOrders,
      preparingOrders,
      completedOrders,
      totalUsers,
      totalAlbums,
      sales,
      latestOrders,
    ] = await Promise.all([
      prisma.products.count(),

      prisma.categories.count(),

      prisma.orders.count(),

      prisma.orders.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.orders.count({
        where: {
          status: "PREPARING",
        },
      }),

      prisma.orders.count({
        where: {
          status: "DELIVERED",
        },
      }),

      prisma.users.count(),

      prisma.albums.count(),

      prisma.orders.aggregate({
        _sum: {
          total_price: true,
        },
      }),

      prisma.orders.findMany({
        take: 5,
        orderBy: {
          created_at: "desc",
        },
        select: {
          id: true,
          total_price: true,
          status: true,
          created_at: true,
        },
      }),
    ]);

    res.json({
      success: true,

      data: {
        totalProducts,

        totalCategories,

        totalOrders,

        pendingOrders,

        preparingOrders,

        completedOrders,

        totalUsers,

        totalAlbums,

        totalSales: sales._sum.total_price || 0,

        latestOrders,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};