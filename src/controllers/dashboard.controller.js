const prisma = require("../config/prisma");

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      preparingOrders,
      completedOrders,
      totalUsers,
      totalAlbums,
      sales
    ] = await Promise.all([
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
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        preparingOrders,
        completedOrders,
        totalUsers,
        totalAlbums,
        totalSales: sales._sum.total_price || 0,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server xətası",
    });
  }
};