import { Context } from "hono";
import { prisma } from "../utils/db";
import { serverError } from "../utils/serverError";
import { generateQRCode, decodeQRData } from "../utils/qrCode";

// ==============================
// HELPER: GENERATE ORDER NUMBER
// ==============================
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// ==============================
// CHECKOUT - CREATE ORDER FROM CART
// ==============================
export const checkout = async (c: Context) => {
    try {
      const user = c.get("user");
      const { paymentType = "CASH" } = await c.req.json();
  
      // Validate payment type
      if (!["CASH", "PAYNOW"].includes(paymentType)) {
        return c.json(
          { success: false, message: "Invalid payment type. Use CASH or PAYNOW" },
          400
        );
      }
  
      // Get user's cart with items
      const cart = await prisma.cart.findUnique({
        where: { userId: user.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
  
      if (!cart || cart.items.length === 0) {
        return c.json(
          { success: false, message: "Cart is empty" },
          400
        );
      }
  
      // Validate stock for all items
      for (const item of cart.items) {
        if (item.product.stock < item.quantity) {
          return c.json(
            {
              success: false,
              message: `Insufficient stock for ${item.product.name}. Only ${item.product.stock} available`,
            },
            400
          );
        }
      }
  
      // Calculate total amount
      const totalAmount = cart.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
  
      // Create order with transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId: user.id,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            paymentType,
            status: "PENDING",
            orderItems: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                subtotal: parseFloat((item.product.price * item.quantity).toFixed(2)),
              })),
            },
          },
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    description: true,
                  },
                },
              },
            },
          },
        });
  
        // Reduce product stock
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
  
        // Clear cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
  
        return newOrder;
      });
  
      return c.json(
        {
          success: true,
          message: "Order created successfully",
          data: {
            ...order,
            nextStep: paymentType === "CASH" 
              ? "Generate QR code at /orders/pay/cash/" + order.id
              : "Generate PayNow QR at /orders/pay/paynow/" + order.id,
          },
        },
        201
      );
    } catch (error) {
      return serverError(c, error);
    }
  };

// GET USER'S ORDERS
// ==============================
export const getUserOrders = async (c: Context) => {
try {
    const user = c.get("user");

    const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
        orderItems: {
        include: {
            product: {
            select: {
                id: true,
                name: true,
                price: true,
                description: true,
            },
            },
        },
        },
    },
    orderBy: { createdAt: "desc" },
    });

    return c.json({
    success: true,
    message: "Orders retrieved successfully",
    data: orders,
    });
} catch (error) {
    return serverError(c, error);
}
};

// ==============================
// GET SINGLE ORDER BY ID
// ==============================
export const getOrderById = async (c: Context) => {
    try {
      const user = c.get("user");
      const orderId = Number(c.req.param("id"));
  
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId: user.id,
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  description: true,
                },
              },
            },
          },
          paymentQR: {
            select: {
              paymentType: true,
              expiresAt: true,
              isUsed: true,
              createdAt: true,
            },
          },
        },
      });
  
      if (!order) {
        return c.json(
          { success: false, message: "Order not found" },
          404
        );
      }
  
      return c.json({
        success: true,
        message: "Order retrieved successfully",
        data: order,
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// GENERATE CASH QR (1 MINUTE EXPIRY)
// ==============================
export const generateCashQR = async (c: Context) => {
    try {
      const user = c.get("user");
      const orderId = Number(c.req.param("orderId"));
  
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: user.id },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      if (order.status !== "PENDING") {
        return c.json(
          { success: false, message: `Order is already ${order.status.toLowerCase()}` },
          400
        );
      }
  
      // Set expiry to 1 minute from now
      const expiresAt = new Date(Date.now() + 60 * 1000);
  
      const qrPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentType: "CASH" as const,
        expiresAt: expiresAt.toISOString(),
        timestamp: new Date().toISOString(),
      };
  
      const qrCode = await generateQRCode(qrPayload);
  
      // Save or update QR in database
      await prisma.paymentQR.upsert({
        where: { orderId: order.id },
        update: {
          qrCode,
          qrData: JSON.stringify(qrPayload),
          paymentType: "CASH",
          expiresAt,
          isUsed: false,
        },
        create: {
          orderId: order.id,
          qrCode,
          qrData: JSON.stringify(qrPayload),
          paymentType: "CASH",
          expiresAt,
        },
      });
  
      return c.json({
        success: true,
        message: "Cash QR code generated (valid for 1 minute)",
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          qrCode,
          expiresAt,
          expiresIn: "60 seconds",
        },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// GENERATE PAYNOW QR (NO EXPIRY)
// ==============================
export const generatePayNowQR = async (c: Context) => {
    try {
      const user = c.get("user");
      const orderId = Number(c.req.param("orderId"));
  
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: user.id },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      if (order.status !== "PENDING") {
        return c.json(
          { success: false, message: `Order is already ${order.status.toLowerCase()}` },
          400
        );
      }
  
      const qrPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentType: "PAYNOW" as const,
        timestamp: new Date().toISOString(),
      };
  
      const qrCode = await generateQRCode(qrPayload);
  
      // Save or update QR in database (no expiry for PayNow)
      await prisma.paymentQR.upsert({
        where: { orderId: order.id },
        update: {
          qrCode,
          qrData: JSON.stringify(qrPayload),
          paymentType: "PAYNOW",
          expiresAt: null,
          isUsed: false,
        },
        create: {
          orderId: order.id,
          qrCode,
          qrData: JSON.stringify(qrPayload),
          paymentType: "PAYNOW",
          expiresAt: null,
        },
      });
  
      return c.json({
        success: true,
        message: "PayNow QR code generated (does not expire)",
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          qrCode,
          expiresAt: null,
          note: "Show this QR to admin for payment verification",
        },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// GET PAYMENT STATUS
// ==============================
export const getPaymentStatus = async (c: Context) => {
    try {
      const user = c.get("user");
      const orderId = Number(c.req.param("orderId"));
  
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: user.id },
        include: {
          paymentQR: true,
        },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      let qrStatus = "NOT_GENERATED";
      let isExpired = false;
  
      if (order.paymentQR) {
        if (order.paymentQR.isUsed) {
          qrStatus = "USED";
        } else if (order.paymentQR.expiresAt && new Date() > order.paymentQR.expiresAt) {
          qrStatus = "EXPIRED";
          isExpired = true;
        } else {
          qrStatus = "ACTIVE";
        }
      }
  
      return c.json({
        success: true,
        message: "Payment status retrieved",
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          paymentType: order.paymentType,
          totalAmount: order.totalAmount,
          qrStatus,
          isExpired,
          paidAt: order.paidAt,
          completedAt: order.completedAt,
        },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };
  
// ==============================
// CANCEL ORDER (Customer)
// ==============================
export const cancelOrder = async (c: Context) => {
    try {
      const user = c.get("user");
      const orderId = Number(c.req.param("orderId"));
  
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: user.id },
        include: { orderItems: true },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      if (order.status !== "PENDING") {
        return c.json(
          { success: false, message: "Only pending orders can be cancelled" },
          400
        );
      }
  
      // Restore stock and cancel order
      await prisma.$transaction(async (tx) => {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
  
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
        });
      });
  
      return c.json({
        success: true,
        message: "Order cancelled successfully",
        data: { orderId, status: "CANCELLED" },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };
// ==============================
// ADMIN: GET ALL ORDERS
// ==============================
export const getAllOrders = async (c: Context) => {
    try {
      const { status, paymentType, page = "1", limit = "10" } = c.req.query();
  
      const where: any = {};
      if (status) where.status = status.toUpperCase();
      if (paymentType) where.paymentType = paymentType.toUpperCase();
  
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            orderItems: {
              include: {
                product: {
                  select: { id: true, name: true, price: true },
                },
              },
            },
            paymentQR: {
              select: {
                paymentType: true,
                expiresAt: true,
                isUsed: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.order.count({ where }),
      ]);
  
      return c.json({
        success: true,
        message: "Orders retrieved successfully",
        data: {
          orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// ADMIN: GET ORDER BY ID
// ==============================
export const getOrderByIdAdmin = async (c: Context) => {
    try {
      const orderId = Number(c.req.param("orderId"));
  
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, price: true, description: true },
              },
            },
          },
          paymentQR: true,
        },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      return c.json({
        success: true,
        message: "Order retrieved successfully",
        data: order,
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// ADMIN: APPROVE PAYMENT (PayNow)
// ==============================
export const approvePayment = async (c: Context) => {
    try {
      const orderId = Number(c.req.param("orderId"));
  
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { paymentQR: true },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      if (order.status !== "PENDING") {
        return c.json(
          { success: false, message: `Order is already ${order.status.toLowerCase()}` },
          400
        );
      }
  
      // Update order status to PAID
      const updatedOrder = await prisma.$transaction(async (tx) => {
        if (order.paymentQR) {
          await tx.paymentQR.update({
            where: { orderId: order.id },
            data: { isUsed: true },
          });
        }
  
        return await tx.order.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            orderItems: {
              include: {
                product: { select: { id: true, name: true, price: true } },
              },
            },
          },
        });
      });
  
      return c.json({
        success: true,
        message: "Payment approved successfully",
        data: updatedOrder,
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// ADMIN: COMPLETE ORDER
// ==============================
export const completeOrder = async (c: Context) => {
    try {
      const orderId = Number(c.req.param("orderId"));
  
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      if (order.status !== "PAID") {
        return c.json(
          { success: false, message: "Only paid orders can be marked as completed" },
          400
        );
      }
  
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
        },
      });
  
      return c.json({
        success: true,
        message: "Order marked as completed",
        data: updatedOrder,
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// ADMIN: REJECT ORDER
// ==============================
export const rejectOrder = async (c: Context) => {
    try {
      const orderId = Number(c.req.param("orderId"));
      const { reason } = await c.req.json();
  
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      if (order.status === "COMPLETED" || order.status === "REJECTED") {
        return c.json(
          { success: false, message: `Cannot reject ${order.status.toLowerCase()} order` },
          400
        );
      }
  
      // Restore stock and reject order
      await prisma.$transaction(async (tx) => {
        // Only restore stock if order wasn't already cancelled
        if (order.status !== "CANCELLED") {
          for (const item of order.orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
  
        if (order.paymentQR) {
          await tx.paymentQR.update({
            where: { orderId: order.id },
            data: { isUsed: true },
          });
        }
  
        await tx.order.update({
          where: { id: orderId },
          data: { status: "REJECTED" },
        });
      });
  
      return c.json({
        success: true,
        message: "Order rejected successfully",
        data: {
          orderId,
          status: "REJECTED",
          reason: reason || "No reason provided",
        },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// ADMIN: SCAN QR CODE
// ==============================
export const scanQRCode = async (c: Context) => {
    try {
      const { qrData } = await c.req.json();
  
      if (!qrData) {
        return c.json({ success: false, message: "QR data is required" }, 400);
      }
  
      // Decode QR data
      const decoded = decodeQRData(qrData);
  
      if (!decoded) {
        return c.json({ success: false, message: "Invalid QR code format" }, 400);
      }
  
      // Find order
      const order = await prisma.order.findUnique({
        where: { id: decoded.orderId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
          paymentQR: true,
        },
      });
  
      if (!order) {
        return c.json({ success: false, message: "Order not found" }, 404);
      }
  
      // Check if QR is already used
      if (order.paymentQR?.isUsed) {
        return c.json(
          {
            success: false,
            message: "QR code has already been used",
            data: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
            },
          },
          400
        );
      }
  
      // Check expiry for CASH payments
      if (decoded.paymentType === "CASH" && decoded.expiresAt) {
        if (new Date() > new Date(decoded.expiresAt)) {
          return c.json(
            {
              success: false,
              message: "QR code has expired",
              data: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                expiredAt: decoded.expiresAt,
              },
            },
            400
          );
        }
      }
  
      // Return order details for admin to process
      return c.json({
        success: true,
        message: "QR code scanned successfully",
        data: {
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount: order.totalAmount,
            paymentType: decoded.paymentType,
            customer: order.user,
            items: order.orderItems,
          },
          qrInfo: {
            paymentType: decoded.paymentType,
            amount: decoded.amount,
            expiresAt: decoded.expiresAt || "No expiry",
            timestamp: decoded.timestamp,
          },
          actions: {
            approve: `/api/admin/orders/approve-payment/${order.id}`,
            complete: `/api/admin/orders/complete/${order.id}`,
            reject: `/api/admin/orders/reject/${order.id}`,
          },
        },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };

// ==============================
// ADMIN: GET ORDER STATISTICS
// ==============================
export const getOrderStats = async (c: Context) => {
    try {
      const [
        totalOrders,
        pendingOrders,
        paidOrders,
        completedOrders,
        cancelledOrders,
        rejectedOrders,
        revenueData,
      ] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.count({ where: { status: "PAID" } }),
        prisma.order.count({ where: { status: "COMPLETED" } }),
        prisma.order.count({ where: { status: "CANCELLED" } }),
        prisma.order.count({ where: { status: "REJECTED" } }),
        prisma.order.aggregate({
          where: { status: { in: ["PAID", "COMPLETED"] } },
          _sum: { totalAmount: true },
        }),
      ]);
  
      // Today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const todayOrders = await prisma.order.count({
        where: { createdAt: { gte: today } },
      });
  
      const todayRevenue = await prisma.order.aggregate({
        where: {
          status: { in: ["PAID", "COMPLETED"] },
          paidAt: { gte: today },
        },
        _sum: { totalAmount: true },
      });
  
      return c.json({
        success: true,
        message: "Order statistics retrieved",
        data: {
          overview: {
            totalOrders,
            pendingOrders,
            paidOrders,
            completedOrders,
            cancelledOrders,
            rejectedOrders,
          },
          revenue: {
            totalRevenue: revenueData._sum.totalAmount || 0,
            todayRevenue: todayRevenue._sum.totalAmount || 0,
          },
          today: {
            orders: todayOrders,
            revenue: todayRevenue._sum.totalAmount || 0,
          },
        },
      });
    } catch (error) {
      return serverError(c, error);
    }
  };


  



