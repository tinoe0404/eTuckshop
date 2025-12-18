// src/controllers/customer.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";

// ==========================================
// GET ALL CUSTOMERS (Admin Only)
// ==========================================
export const getAllCustomers = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    console.log(`👥 Admin ${user.email} (ID: ${user.id}) fetching customers list`);

    const { search, page = "1", limit = "10", sortBy = "createdAt", order = "desc" } = c.req.query();

    const where: any = { role: "CUSTOMER" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
      console.log(`🔍 Searching for: "${search}"`);
    }

    const orderByField = sortBy || "createdAt";
    const orderDirection = order === "asc" ? "asc" : "desc";

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { [orderByField]: orderDirection },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    console.log(`📊 Found ${total} customers (page ${page}/${Math.ceil(total / parseInt(limit))})`);

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

    console.log(`✅ Customers list retrieved successfully by ${user.email}`);

    return c.json({
      success: true,
      message: "Customers retrieved successfully",
      data: {
        customers: customersWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    return serverError(c, error);
  }
};

// ==========================================
// GET CUSTOMER BY ID (Admin Only)
// ==========================================
export const getCustomerById = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    const id = Number(c.req.param("id"));
    console.log(`👤 Admin ${user.email} (ID: ${user.id}) fetching customer ${id}`);

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer) {
      console.log(`❌ Customer ${id} not found`);
      return c.json({ success: false, message: "Customer not found" }, 404);
    }

    if (customer.role !== "CUSTOMER") {
      console.log(`❌ User ${id} is not a customer (role: ${customer.role})`);
      return c.json({ success: false, message: "User is not a customer" }, 400);
    }

    console.log(`📋 Fetching detailed stats for customer: ${customer.email}`);

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

    console.log(`✅ Customer details retrieved: ${customer.email} (${orders.length} orders)`);

    return c.json({
      success: true,
      message: "Customer details retrieved successfully",
      data: {
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
      },
    });
  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    return serverError(c, error);
  }
};

// ==========================================
// GET CUSTOMER STATISTICS (Admin Only)
// ==========================================
export const getCustomerStats = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    console.log(`📊 Admin ${user.email} (ID: ${user.id}) fetching customer statistics`);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalCustomers, activeCustomers, newCustomersThisMonth, topCustomers] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({
        where: { role: "CUSTOMER", orders: { some: { status: { in: ["PAID", "COMPLETED"] } } } },
      }),
      prisma.user.count({
        where: {
          role: "CUSTOMER",
          createdAt: { gte: startOfMonth },
        },
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

    console.log(`✅ Customer statistics retrieved by ${user.email}`);
    console.log(`   Total: ${totalCustomers}, Active: ${activeCustomers}, New this month: ${newCustomersThisMonth}`);

    return c.json({
      success: true,
      message: "Customer statistics retrieved successfully",
      data: {
        totalCustomers,
        activeCustomers,
        newCustomersThisMonth,
        inactiveCustomers: totalCustomers - activeCustomers,
        topCustomers: topCustomersWithDetails,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching customer statistics:', error);
    return serverError(c, error);
  }
};

// ==========================================
// DELETE CUSTOMER (Admin Only)
// ==========================================
export const deleteCustomer = async (c: Context) => {
  try {
    // ✅ Get authenticated admin user from context
    const user = c.get("user");
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    const id = Number(c.req.param("id"));
    console.log(`🗑️ Admin ${user.email} (ID: ${user.id}) attempting to delete customer ${id}`);

    const customer = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!customer) {
      console.log(`❌ Customer ${id} not found`);
      return c.json({ success: false, message: "Customer not found" }, 404);
    }

    if (customer.role !== "CUSTOMER") {
      console.log(`❌ Cannot delete user ${id} - not a customer (role: ${customer.role})`);
      return c.json({ success: false, message: "Cannot delete admin users" }, 400);
    }

    if (customer._count.orders > 0) {
      console.log(`⚠️ Cannot delete customer ${id} - has ${customer._count.orders} orders`);
      return c.json(
        {
          success: false,
          message: `Cannot delete customer. They have ${customer._count.orders} order(s). Consider deactivating instead.`,
        },
        400
      );
    }

    // Also delete related cart data
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cart: { userId: id } } }),
      prisma.cart.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    console.log(`✅ Customer deleted: ${customer.email} (ID: ${id}) by ${user.email}`);

    return c.json({
      success: true,
      message: "Customer deleted successfully",
      data: { id, name: customer.name, email: customer.email },
    });
  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    return serverError(c, error);
  }
};