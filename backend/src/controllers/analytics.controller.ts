import { Context } from "hono";
import { prisma } from "../utils/db";
import { serverError } from "../utils/serverError";

// ==========================================
// GET ANALYTICS DASHBOARD DATA
// ==========================================
export const getAnalytics = async (c: Context) => {
  try {
    const { startDate, endDate } = c.req.query();

    // Set date range (default: last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for better performance
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      completedOrders,
      revenueData,
      dailyStats,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      // Total users count
      prisma.user.count(),

      // Total products count
      prisma.product.count(),

      // Total orders count
      prisma.order.count(),

      // Completed orders (for sales count)
      prisma.order.count({
        where: { status: "COMPLETED" },
      }),

      // Total revenue from completed and paid orders
      prisma.order.aggregate({
        where: {
          status: { in: ["PAID", "COMPLETED"] },
        },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
        _count: true,
      }),

      // Daily sales and revenue stats (last 30 days)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as order_count,
          SUM(CASE WHEN status IN ('PAID', 'COMPLETED') THEN total_amount ELSE 0 END) as revenue
        FROM "Order"
        WHERE created_at >= ${start} AND created_at <= ${end}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        _count: { productId: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Recent orders
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Get product details for top products
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      include: { category: true },
    });

    const topProductsWithDetails = topProducts.map(tp => {
      const product = productDetails.find(p => p.id === tp.productId);
      return {
        productId: tp.productId,
        name: product?.name || 'Unknown',
        category: product?.category.name || 'Unknown',
        totalSold: tp._sum.quantity || 0,
        orderCount: tp._count.productId || 0,
      };
    });

    // Format daily stats
    const formattedDailyStats = (dailyStats as any[]).map((stat: any) => ({
      date: stat.date.toISOString().split('T')[0],
      sales: Number(stat.order_count),
      revenue: parseFloat(Number(stat.revenue || 0).toFixed(2)),
    }));

    // Calculate growth (comparing to previous period)
    const previousPeriodEnd = new Date(start);
    const previousPeriodStart = new Date(
      start.getTime() - (end.getTime() - start.getTime())
    );

    const previousRevenue = await prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "COMPLETED"] },
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
      },
      _sum: { totalAmount: true },
    });

    const currentRevenue = revenueData._sum.totalAmount || 0;
    const prevRevenue = previousRevenue._sum.totalAmount || 0;
    const revenueGrowth = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
      : 0;

    return c.json({
      success: true,
      message: "Analytics data retrieved successfully",
      data: {
        summary: {
          totalUsers,
          totalProducts,
          totalSales: completedOrders,
          totalRevenue: parseFloat((revenueData._sum.totalAmount || 0).toFixed(2)),
          averageOrderValue: parseFloat((revenueData._avg.totalAmount || 0).toFixed(2)),
          totalOrders,
          revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
        },
        dailyStats: formattedDailyStats,
        topProducts: topProductsWithDetails,
        recentOrders,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};