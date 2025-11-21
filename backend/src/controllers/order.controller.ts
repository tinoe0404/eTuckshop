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

