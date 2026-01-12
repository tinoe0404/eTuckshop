// src/controllers/analytics.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { getOrSetCache } from "../utils/redis";

// ==========================================
// GET DASHBOARD STATS - CACHED
// ==========================================
export const getDashboardStats = async (c: Context) => {
  try {
    const stats = await getOrSetCache(
      "analytics:dashboard:stats",
      async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          totalOrders,
          pendingOrders,
          completedOrders,
          totalProducts,
          lowStockProducts,
          totalCustomers,
          totalRevenue,
          todayRevenue,
        ] = await Promise.all([
          prisma.order.count(),
          prisma.order.count({ where: { status: "PENDING" } }),
          prisma.order.count({ where: { status: "COMPLETED" } }),
          prisma.product.count(),
          prisma.product.count({ where: { stock: { lte: 10 } } }),
          prisma.user.count({ where: { role: "CUSTOMER" } }),
          prisma.order.aggregate({
            where: { status: "COMPLETED" },
            _sum: { totalAmount: true },
          }),
          prisma.order.aggregate({
            where: {
              status: "COMPLETED",
              completedAt: { gte: today },
            },
            _sum: { totalAmount: true },
          }),
        ]);

        return {
          totalOrders,
          pendingOrders,
          completedOrders,
          totalProducts,
          lowStockProducts,
          totalCustomers,
          totalRevenue: Number((totalRevenue._sum.totalAmount ?? 0).toFixed(2)),
          todayRevenue: Number((todayRevenue._sum.totalAmount ?? 0).toFixed(2)),
        };
      },
      60
    );

    return c.json({ success: true, data: stats });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// GET ANALYTICS DASHBOARD DATA
// ==========================================
export const getAnalytics = async (c: Context) => {
  try {
    const { startDate, endDate } = c.req.query();

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    end.setHours(23, 59, 59, 999);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const cacheKey = `analytics:data:${startStr}:${endStr}`;

    const analyticsData = await getOrSetCache(
      cacheKey,
      async () => {
        const [
          totalUsers,
          totalProducts,
          totalOrders,
          completedOrders,
          revenueData,
          topProductsRaw,
          recentOrders,
          ordersInRange,
        ] = await Promise.all([
          prisma.user.count(),
          prisma.product.count(),
          prisma.order.count(),
          prisma.order.count({ where: { status: "COMPLETED" } }),
          prisma.order.aggregate({
            where: { status: { in: ["PAID", "COMPLETED"] } },
            _sum: { totalAmount: true },
            _avg: { totalAmount: true },
          }),
          prisma.orderItem.groupBy({
            by: ["productId"],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 5,
          }),
          prisma.order.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          }),
          prisma.order.findMany({
            where: { createdAt: { gte: start, lte: end } },
            select: {
              createdAt: true,
              status: true,
              totalAmount: true,
            },
          }),
        ]);

        // =============================
        // DAILY STATS (IN-MEMORY)
        // =============================
        const dailyStatsMap = new Map<
          string,
          { sales: number; revenue: number }
        >();

        ordersInRange.forEach((order) => {
          const dateKey = order.createdAt.toISOString().split("T")[0];
          const current = dailyStatsMap.get(dateKey) ?? {
            sales: 0,
            revenue: 0,
          };

          current.sales += 1;
          if (["PAID", "COMPLETED"].includes(order.status)) {
            current.revenue += order.totalAmount;
          }

          dailyStatsMap.set(dateKey, current);
        });

        const dailyStats = Array.from(dailyStatsMap.entries())
          .map(([date, stats]) => ({
            date,
            sales: stats.sales,
            revenue: Number(stats.revenue.toFixed(2)),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // =============================
        // TOP PRODUCTS (NULL-SAFE)
        // =============================
        const productIds = topProductsRaw
          .map((p) => p.productId)
          .filter((id): id is number => id !== null);

        const productDetails = await prisma.product.findMany({
          where: { id: { in: productIds } },
          include: {
            category: true, // must exist as a Prisma relation
          },
        });

        const topProducts = topProductsRaw
          .filter((tp): tp is typeof tp & { productId: number } => tp.productId !== null)
          .map((tp) => {
            const product = productDetails.find(
              (p) => p.id === tp.productId
            );

            return {
              productId: tp.productId,
              name: product?.name ?? "Unknown",
              category: product?.category?.name ?? "Uncategorized",
              totalSold: tp._sum.quantity ?? 0,
            };
          });

        // =============================
        // REVENUE GROWTH
        // =============================
        const periodLength = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - periodLength);

        const previousRevenue = await prisma.order.aggregate({
          where: {
            status: { in: ["PAID", "COMPLETED"] },
            createdAt: { gte: prevStart, lt: start },
          },
          _sum: { totalAmount: true },
        });

        const currentRev = revenueData._sum.totalAmount ?? 0;
        const prevRev = previousRevenue._sum.totalAmount ?? 0;

        const revenueGrowth =
          prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;

        return {
          summary: {
            totalUsers,
            totalProducts,
            totalOrders,
            totalSales: completedOrders,
            totalRevenue: Number(currentRev.toFixed(2)),
            averageOrderValue: Number(
              (revenueData._avg.totalAmount ?? 0).toFixed(2)
            ),
            revenueGrowth: Number(revenueGrowth.toFixed(2)),
          },
          dailyStats,
          topProducts,
          recentOrders,
          dateRange: { start: startStr, end: endStr },
        };
      },
      120
    );

    return c.json({ success: true, data: analyticsData });
  } catch (error) {
    return serverError(c, error);
  }
};
