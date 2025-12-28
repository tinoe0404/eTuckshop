// src/controllers/customer.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { getOrSetCache, cache } from "../utils/redis";

// ==========================================
// GET ALL CUSTOMERS (Admin Only - Cached)
// ==========================================
export const getAllCustomers = async (c: Context) => {
  try {
    const user = c.get("user");
    // Query Params
    const { search, page = "1", limit = "10", sortBy = "createdAt", order = "desc" } = c.req.query();

    // Unique Cache Key based on all filters
    const cacheKey = `customers:list:${page}:${limit}:${sortBy}:${order}:${search || 'all'}`;

    // Cache for 60 seconds (Short TTL to keep lists relatively fresh)
    const result = await getOrSetCache(cacheKey, async () => {
        console.log(`👥 Admin ${user.email} fetching fresh customers list from DB`);
        
        const where: any = { role: "CUSTOMER" };
        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ];
        }
    
        const orderByField = sortBy || "createdAt";
        const orderDirection = order === "asc" ? "asc" : "desc";
    
        const [customers, total] = await Promise.all([
          prisma.user.findMany({
            where,
            select: {
              id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true,
              _count: { select: { orders: true } },
            },
            orderBy: { [orderByField]: orderDirection },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
          }),
          prisma.user.count({ where }),
        ]);
    
        // Heavy Aggregation: Calculate stats for each customer
        const customersWithStats = await Promise.all(
          customers.map(async (customer) => {
            const orderStats = await prisma.order.aggregate({
              where: { userId: customer.id, status: { in: ["PAID", "COMPLETED"] } },
              _sum: { totalAmount: true },
              _count: true,
            });
    
            const lastOrder = await prisma.order.findFirst({
              where: { userId: customer.id },
              orderBy: { createdAt: "desc" },
              select: { createdAt: true, orderNumber: true, totalAmount: true },
            });
    
            return {
              ...customer,
              totalOrders: customer._count.orders,
              completedOrders: orderStats._count || 0,
              totalSpent: parseFloat((orderStats._sum.totalAmount || 0).toFixed(2)),
              lastOrder: lastOrder
                ? {
                    orderNumber: lastOrder.orderNumber,
                    amount: lastOrder.totalAmount,
                    date: lastOrder.createdAt,
                  }
                : null,
            };
          })
        );

        return {
            customers: customersWithStats,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              totalPages: Math.ceil(total / parseInt(limit)),
            },
        };
    }, 60); 

    return c.json({
      success: true,
      message: "Customers retrieved successfully",
      data: result,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// GET CUSTOMER BY ID (Admin Only - Cached)
// ==========================================
export const getCustomerById = async (c: Context) => {
  try {
    const user = c.get("user");
    const id = Number(c.req.param("id"));
    const cacheKey = `customer:${id}`;

    // Cache detailed view for 5 minutes
    const data = await getOrSetCache(cacheKey, async () => {
        console.log(`👤 Admin ${user.email} fetching customer ${id} from DB`);
        
        const customer = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
        });
    
        if (!customer) return null;
        if (customer.role !== "CUSTOMER") throw new Error("User is not a customer");
    
        const orders = await prisma.order.findMany({
            where: { userId: id },
            include: { orderItems: { include: { product: true } } },
            orderBy: { createdAt: "desc" },
            take: 10,
        });
    
        const stats = await prisma.order.aggregate({
            where: { userId: id, status: { in: ["PAID", "COMPLETED"] } },
            _sum: { totalAmount: true },
            _avg: { totalAmount: true },
            _count: true,
        });
    
        const statusBreakdown = await Promise.all([
            prisma.order.count({ where: { userId: id, status: "PENDING" } }),
            prisma.order.count({ where: { userId: id, status: "PAID" } }),
            prisma.order.count({ where: { userId: id, status: "COMPLETED" } }),
            prisma.order.count({ where: { userId: id, status: "CANCELLED" } }),
        ]);

        return {
            ...customer,
            statistics: {
              totalOrders: orders.length,
              completedOrdersCount: stats._count || 0,
              totalSpent: parseFloat((stats._sum.totalAmount || 0).toFixed(2)),
              averageOrderValue: parseFloat((stats._avg.totalAmount || 0).toFixed(2)),
              pendingOrders: statusBreakdown[0],
              paidOrders: statusBreakdown[1],
              completedOrders: statusBreakdown[2],
              cancelledOrders: statusBreakdown[3],
            },
            recentOrders: orders,
        };
    }, 300); // 5 Minutes TTL

    if (!data) return c.json({ success: false, message: "Customer not found" }, 404);

    return c.json({
      success: true,
      message: "Customer details retrieved successfully",
      data: data,
    });
  } catch (error: any) {
    if(error.message === "User is not a customer") {
        return c.json({ success: false, message: "User is not a customer" }, 400);
    }
    return serverError(c, error);
  }
};

// ==========================================
// GET CUSTOMER STATISTICS (Admin Only - Cached)
// ==========================================
export const getCustomerStats = async (c: Context) => {
  try {
    const user = c.get("user");

    // Cache Stats for 10 minutes (Dashboard widgets)
    const stats = await getOrSetCache("customers:stats", async () => {
        console.log(`📊 Admin ${user.email} calculating fresh customer stats`);
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
        const [totalCustomers, activeCustomers, newCustomersThisMonth, topCustomers] = await Promise.all([
          prisma.user.count({ where: { role: "CUSTOMER" } }),
          prisma.user.count({
            where: { role: "CUSTOMER", orders: { some: { status: { in: ["PAID", "COMPLETED"] } } } },
          }),
          prisma.user.count({
            where: { role: "CUSTOMER", createdAt: { gte: startOfMonth } },
          }),
          prisma.order.groupBy({
            by: ["userId"],
            where: { status: { in: ["PAID", "COMPLETED"] } },
            _sum: { totalAmount: true },
            _count: true,
            orderBy: { _sum: { totalAmount: "desc" } },
            take: 5,
          }),
        ]);
    
        const topCustomerIds = topCustomers.map((tc) => tc.userId);
        const customerDetails = await prisma.user.findMany({
          where: { id: { in: topCustomerIds } },
          select: { id: true, name: true, email: true },
        });
    
        const topCustomersWithDetails = topCustomers.map((tc) => {
          const customer = customerDetails.find((c) => c.id === tc.userId);
          return {
            userId: tc.userId,
            name: customer?.name || "Unknown",
            email: customer?.email || "Unknown",
            totalSpent: parseFloat((tc._sum.totalAmount || 0).toFixed(2)),
            orderCount: tc._count,
          };
        });

        return {
            totalCustomers,
            activeCustomers,
            newCustomersThisMonth,
            inactiveCustomers: totalCustomers - activeCustomers,
            topCustomers: topCustomersWithDetails,
        };
    }, 600); // 10 Minutes TTL

    return c.json({
      success: true,
      message: "Customer statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// DELETE CUSTOMER (Admin Only)
// ==========================================
export const deleteCustomer = async (c: Context) => {
  try {
    const user = c.get("user");
    const id = Number(c.req.param("id"));

    const customer = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!customer) return c.json({ success: false, message: "Customer not found" }, 404);
    if (customer.role !== "CUSTOMER") return c.json({ success: false, message: "Cannot delete admin users" }, 400);

    if (customer._count.orders > 0) {
      return c.json({
        success: false,
        message: `Cannot delete customer. They have ${customer._count.orders} order(s).`,
      }, 400);
    }

    // DB Transaction
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cart: { userId: id } } }),
      prisma.cart.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    // 🔄 Invalidate Caches
    // Note: We cannot easily wildcard delete 'customers:list:*' without scanning.
    // We rely on the short TTL (60s) for lists to refresh.
    await Promise.all([
        cache.del(`customer:${id}`),     // Specific user details
        cache.del("customers:stats"),    // Dashboard stats (total counts changed)
        cache.del(`cart:${id}`),         // Their cart cache
    ]);

    return c.json({
      success: true,
      message: "Customer deleted successfully",
      data: { id, name: customer.name, email: customer.email },
    });
  } catch (error) {
    return serverError(c, error);
  }
};