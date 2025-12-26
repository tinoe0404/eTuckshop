// src/controllers/analytics.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { cache } from "../utils/redis";

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  DASHBOARD_STATS: 60,  // 1 minute - updates frequently with new orders
  ANALYTICS: 120,       // 2 minutes - more complex query, less critical freshness
};

// ==========================================
// GET DASHBOARD STATS - CACHED
// ==========================================
export const getDashboardStats = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    console.log(`📊 Admin ${user.email} (ID: ${user.id}) fetching dashboard stats`);

    // 1. Build cache key (admin-agnostic - same for all admins)
    const cacheKey = "analytics:dashboard:stats";

    // 2. Try cache first
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      console.log(`✅ Dashboard stats served from cache for ${user.email}`);
      return c.json({
        success: true,
        message: "Dashboard stats retrieved successfully (cached)",
        data: cached,
        cached: true,
      });
    }

    // 3. Cache miss - query database
    // Get today's date at midnight for today's revenue calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel queries for better performance
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
      // Total orders count
      prisma.order.count(),

      // Pending orders count
      prisma.order.count({
        where: { status: "PENDING" },
      }),

      // Completed orders count
      prisma.order.count({
        where: { status: "COMPLETED" },
      }),

      // Total products count
      prisma.product.count(),

      // Low stock products (stock <= 10)
      prisma.product.count({
        where: { stock: { lte: 10 } },
      }),

      // Total customers count
      prisma.user.count({
        where: { role: "CUSTOMER" },
      }),

      // Total revenue from completed orders
      prisma.order.aggregate({
        where: { status: "COMPLETED" },
        _sum: { totalAmount: true },
      }),

      // Today's revenue
      prisma.order.aggregate({
        where: {
          status: "COMPLETED",
          completedAt: { gte: today },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    console.log(`✅ Dashboard stats retrieved successfully for ${user.email}`);

    // 4. Transform data
    const stats = {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalProducts,
      lowStockProducts,
      totalRevenue: parseFloat((totalRevenue._sum.totalAmount || 0).toFixed(2)),
      todayRevenue: parseFloat((todayRevenue._sum.totalAmount || 0).toFixed(2)),
      totalCustomers,
    };

    // 5. Set cache with TTL
    await cache.set(cacheKey, stats, CACHE_TTL.DASHBOARD_STATS);

    // 6. Return response
    return c.json({
      success: true,
      message: "Dashboard stats retrieved successfully",
      data: stats,
      cached: false,
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    return serverError(c, error);
  }
};

// ==========================================
// GET ANALYTICS DASHBOARD DATA - CACHED WITH QUERY PARAMS
// ==========================================
export const getAnalytics = async (c: Context) => {
  try {
    // ✅ Get authenticated user from context
    const user = c.get('user');
    console.log(`📈 Admin ${user.email} (ID: ${user.id}) fetching analytics data`);

    const { startDate, endDate } = c.req.query();

    // Set date range (default: last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // 1. Build cache key with date range encoded
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const cacheKey = `analytics:data:${startStr}:${endStr}`;

    console.log(`📅 Date range: ${startStr} to ${endStr}`);

    // 2. Try cache first
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      console.log(`✅ Analytics data served from cache for ${user.email}`);
      return c.json({
        success: true,
        message: "Analytics data retrieved successfully (cached)",
        data: cached,
        cached: true,
      });
    }

    // 3. Cache miss - query database
    // Parallel queries for better performance
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      completedOrders,
      revenueData,
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

      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        _count: { productId: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Recent orders with user details
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { 
            select: { 
              id: true,
              name: true, 
              email: true 
            } 
          },
        },
      }),
    ]);

    // ✅ FIX: Get daily stats using Prisma (not raw SQL)
    // Group orders by date for the chart
    const ordersInRange = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
        status: true,
        totalAmount: true,
      },
    });

    // Process daily stats manually (safer than raw SQL)
    const dailyStatsMap = new Map<string, { sales: number; revenue: number }>();
    
    ordersInRange.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const current = dailyStatsMap.get(dateKey) || { sales: 0, revenue: 0 };
      
      current.sales += 1;
      if (order.status === 'PAID' || order.status === 'COMPLETED') {
        current.revenue += order.totalAmount;
      }
      
      dailyStatsMap.set(dateKey, current);
    });

    // Convert map to sorted array
    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({
        date,
        sales: stats.sales,
        revenue: parseFloat(stats.revenue.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

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

    // Calculate growth (comparing to previous period)
    const periodLength = end.getTime() - start.getTime();
    const previousPeriodEnd = new Date(start);
    const previousPeriodStart = new Date(start.getTime() - periodLength);

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

    console.log(`✅ Analytics data retrieved successfully for ${user.email}`);
    console.log(`   Total Revenue: $${currentRevenue.toFixed(2)}`);
    console.log(`   Growth: ${revenueGrowth.toFixed(2)}%`);
    console.log(`   Daily Stats Points: ${dailyStats.length}`);

    // 4. Transform data
    const analyticsData = {
      summary: {
        totalUsers,
        totalProducts,
        totalSales: completedOrders,
        totalRevenue: parseFloat((revenueData._sum.totalAmount || 0).toFixed(2)),
        averageOrderValue: parseFloat((revenueData._avg.totalAmount || 0).toFixed(2)),
        totalOrders,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      },
      dailyStats,
      topProducts: topProductsWithDetails,
      recentOrders,
      dateRange: {
        start: startStr,
        end: endStr,
      },
    };

    // 5. Set cache with TTL
    await cache.set(cacheKey, analyticsData, CACHE_TTL.ANALYTICS);

    // 6. Return response
    return c.json({
      success: true,
      message: "Analytics data retrieved successfully",
      data: analyticsData,
      cached: false,
    });
  } catch (error) {
    console.error('❌ Error fetching analytics data:', error);
    return serverError(c, error);
  }
};