// src/controllers/order.controller.ts
import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { generateQRCode, decodeQRData, QRPayload } from "../utils/qrCode";
import { cache, getOrSetCache, TTL } from "../utils/redis";

// Helper: Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// Helper: Build QR payload
const buildQRPayload = (order: any, expiresAt?: Date): QRPayload => {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentType: order.paymentType,
    paymentStatus: order.status === "PAID" ? "PAID" : "PENDING",
    customer: {
      name: order.user.name,
      email: order.user.email,
    },
    orderSummary: {
      items: order.orderItems.map((item: any) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        subtotal: item.subtotal,
      })),
      totalItems: order.orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
      totalAmount: order.totalAmount,
    },
    expiresAt: expiresAt?.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// CHECKOUT - CREATE ORDER
// ==========================================
export const checkout = async (c: Context) => {
  try {
    const user = c.get('user');
    const { paymentType = "CASH" } = await c.req.json();

    if (!user) return c.json({ success: false, message: "Authentication required" }, 401);

    if (!["CASH", "PAYNOW"].includes(paymentType)) {
      return c.json({ success: false, message: "Invalid payment type" }, 400);
    }

    // 1. Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return c.json({ success: false, message: "Cart is empty" }, 400);
    }

    // 2. Validate stock
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return c.json({
          success: false,
          message: `Insufficient stock for ${item.product.name}`,
        }, 400);
      }
    }

    // 3. Prep Data
    const totalAmount = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const orderNumber = generateOrderNumber();
    const orderItemsData = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      subtotal: parseFloat((item.product.price * item.quantity).toFixed(2)),
    }));

    const stockUpdates = cart.items.map((item) => ({
      id: item.productId,
      quantity: item.quantity,
    }));

    // 4. Transaction (Write Only)
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          paymentType,
          status: "PENDING",
          orderItems: { create: orderItemsData },
        },
        include: { orderItems: { include: { product: true } } },
      });

      // Update Stock
      await Promise.all(
        stockUpdates.map((update) =>
          tx.product.update({
            where: { id: update.id },
            data: { stock: { decrement: update.quantity } },
          })
        )
      );

      // Clear Cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    // 🔄 INVALIDATE CACHES
    // 1. Invalidate User's order list and Stats
    await cache.invalidateOrders(undefined, user.id);
    // 2. Invalidate Products (Stock changed!)
    await cache.invalidateProducts();

    // 5. Response
    const response: any = {
      success: true,
      message: "Order created successfully",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentType: order.paymentType,
        status: order.status,
      },
    };

    if (paymentType === "CASH") {
      response.data.nextStep = {
        action: "Generate QR Code",
        url: `/api/orders/generate-qr/${order.id}`,
      };
    } else {
      response.data.nextStep = {
        action: "Complete PayNow Payment",
        url: `/api/orders/pay/paynow/${order.id}`,
      };
    }

    return c.json(response, 201);
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// GENERATE CASH QR
// ==========================================
export const generateCashQR = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { product: true } },
      },
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.paymentType !== "CASH") return c.json({ success: false, message: "Not a Cash order" }, 400);
    if (order.status !== "PENDING") return c.json({ success: false, message: `Order already ${order.status}` }, 400);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const qrPayload = buildQRPayload(order, expiresAt);
    const qrCode = await generateQRCode(qrPayload);

    await prisma.paymentQR.upsert({
      where: { orderId: order.id },
      update: { qrCode, qrData: JSON.stringify(qrPayload), expiresAt, isUsed: false },
      create: { 
        orderId: order.id, qrCode, qrData: JSON.stringify(qrPayload), 
        paymentType: "CASH", expiresAt 
      },
    });

    // 🔄 Invalidate Detail Cache
    await cache.invalidateOrders(orderId);

    return c.json({
      success: true,
      message: "QR code generated",
      data: { qrCode, expiresAt, expiresIn: "900 seconds" },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// INITIATE PAYNOW
// ==========================================
export const initiatePayNow = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.paymentType !== "PAYNOW") return c.json({ success: false, message: "Not a PayNow order" }, 400);

    const paymentRef = `PAY-${order.orderNumber}-${Date.now().toString(36).toUpperCase()}`;

    await prisma.paymentQR.upsert({
      where: { orderId: order.id },
      update: { qrData: paymentRef, isUsed: false },
      create: { orderId: order.id, qrCode: "", qrData: paymentRef, paymentType: "PAYNOW" },
    });

    // 🔄 Invalidate Detail Cache
    await cache.invalidateOrders(orderId);

    // Determine Frontend URL
    const origin = c.req.header('origin') || c.req.header('referer');
    let frontendUrl = 'http://localhost:3000';
    if (origin && !origin.includes('localhost')) frontendUrl = new URL(origin).origin;
    else if (process.env.FRONTEND_URL) frontendUrl = process.env.FRONTEND_URL;

    const paymentUrl = `${frontendUrl}/orders/payment/paynow/${order.id}?ref=${paymentRef}`;

    return c.json({
      success: true,
      data: { paymentRef, paymentUrl },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// PROCESS PAYNOW PAYMENT
// ==========================================
export const processPayNowPayment = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    const paymentRef = c.req.query("ref");

    if (!orderId || !paymentRef) return c.json({ success: false, message: "Invalid Request" }, 400);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: { include: { product: true } },
        paymentQR: true,
      },
    });

    if (!order || !order.paymentQR) return c.json({ success: false, message: "Order or Payment record not found" }, 404);
    if (order.paymentQR.qrData !== paymentRef) return c.json({ success: false, message: "Invalid Ref" }, 400);
    
    // Return early if already paid (Idempotency)
    if (order.status === "PAID" && order.paymentQR.qrCode) {
        return c.json({ success: true, message: "Already Paid", data: { qrCode: order.paymentQR.qrCode } });
    }

    // Generate Success QR
    const qrPayload: QRPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentType: "PAYNOW",
      paymentStatus: "PAID",
      customer: { name: order.user.name, email: order.user.email },
      orderSummary: {
        items: order.orderItems.map((i: any) => ({ 
            name: i.product.name, quantity: i.quantity, price: i.product.price, subtotal: i.subtotal 
        })),
        totalItems: order.orderItems.reduce((s:number, i:any) => s + i.quantity, 0),
        totalAmount: order.totalAmount,
      },
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const qrCode = await generateQRCode(qrPayload);

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID", paidAt: new Date() },
      }),
      prisma.paymentQR.update({
        where: { orderId },
        data: { qrCode, qrData: JSON.stringify(qrPayload), expiresAt: null, isUsed: false },
      }),
    ]);

    // 🔄 Invalidate caches
    await cache.invalidateOrders(orderId, order.userId);

    return c.json({
      success: true,
      message: "Payment successful",
      data: { qrCode },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// GET USER ORDERS (CACHED)
// ==========================================
export const getUserOrdersGet = async (c: Context) => {
  try {
    const userId = Number(c.req.query('userId') || (c.get('user') as any)?.id);

    if (!userId) return c.json({ success: false, message: 'User ID required' }, 400);

    const cacheKey = `orders:user:${userId}`;

    const orders = await getOrSetCache(cacheKey, async () => {
        return await prisma.order.findMany({
            where: { userId },
            include: { orderItems: { include: { product: true } } },
            orderBy: { createdAt: "desc" },
        });
    }, TTL.USER_ORDERS);

    return c.json({ success: true, data: orders });
  } catch (error) {
    return serverError(c, error);
  }
};

// Legacy support
export const getUserOrders = async (c: Context) => getUserOrdersGet(c);

// ==========================================
// GET ORDER BY ID (CACHED)
// ==========================================
export const getOrderById = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("id"));
    const userId = c.req.query("userId"); 

    if (!userId) return c.json({ success: false, message: "User ID required" }, 400);

    const cacheKey = `orders:detail:${orderId}`;

    const order = await getOrSetCache(cacheKey, async () => {
        return await prisma.order.findFirst({
            where: { id: orderId, userId: parseInt(userId) },
            include: {
                orderItems: { include: { product: true } },
                paymentQR: { select: { expiresAt: true, isUsed: true, paymentType: true } },
            },
        });
    }, TTL.ORDER_DETAIL);

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);

    return c.json({ success: true, data: order });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// GET ORDER QR
// ==========================================
export const getOrderQR = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    // Since this is specific, we don't cache the logic check, but we could cache the DB fetch
    // However, expiration logic implies real-time need. Let's fetch fresh.
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentQR: true },
    });

    if (!order || !order.paymentQR?.qrCode) {
      return c.json({ success: false, message: "QR not found" }, 404);
    }

    if (order.paymentType === "CASH" && order.paymentQR.expiresAt) {
      if (new Date() > order.paymentQR.expiresAt) {
        return c.json({ success: false, message: "QR expired" }, 400);
      }
    }

    const payload = JSON.parse(order.paymentQR.qrData);
    return c.json({
      success: true,
      data: { ...payload, qrCode: order.paymentQR.qrCode },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// CANCEL ORDER
// ==========================================
export const cancelOrder = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: { orderItems: true },
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.status !== "PENDING") return c.json({ success: false, message: "Cannot cancel" }, 400);

    await prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    });

    // 🔄 INVALIDATE (Orders + Products)
    await cache.invalidateOrders(orderId, user.id);
    await cache.invalidateProducts();

    return c.json({ success: true, message: "Order cancelled" });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// ADMIN: GET ALL ORDERS (NO CACHE - REALTIME)
// ==========================================
export const getAllOrders = async (c: Context) => {
  try {
    const { status, paymentType, page = "1", limit = "10" } = c.req.query();
    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (paymentType) where.paymentType = paymentType.toUpperCase();

    // Admin lists should generally be fresh to avoid processing old orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          orderItems: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    return c.json({
      success: true,
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

// ==========================================
// ADMIN: GET STATS (CACHED)
// ==========================================
export const getOrderStats = async (c: Context) => {
  try {
    const stats = await getOrSetCache("orders:stats", async () => {
        const [total, pending, paid, completed, cancelled, revenue] = await Promise.all([
            prisma.order.count(),
            prisma.order.count({ where: { status: "PENDING" } }),
            prisma.order.count({ where: { status: "PAID" } }),
            prisma.order.count({ where: { status: "COMPLETED" } }),
            prisma.order.count({ where: { status: "CANCELLED" } }),
            prisma.order.aggregate({
                where: { status: { in: ["PAID", "COMPLETED"] } },
                _sum: { totalAmount: true },
            }),
        ]);

        return {
            orders: { total, pending, paid, completed, cancelled },
            revenue: revenue._sum.totalAmount || 0,
        };
    }, TTL.STATS);

    return c.json({ success: true, data: stats });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// ADMIN: SCAN QR
// ==========================================
export const scanQRCode = async (c: Context) => {
  try {
    const { qrData } = await c.req.json();
    if (!qrData) return c.json({ success: false, message: "QR data required" }, 400);

    const decoded = decodeQRData(qrData);
    if (!decoded) return c.json({ success: false, message: "Invalid QR" }, 400);

    const order = await prisma.order.findUnique({
      where: { id: decoded.orderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: { include: { product: true } },
        paymentQR: true,
      },
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.orderNumber !== decoded.orderNumber) return c.json({ success: false, message: "Mismatch" }, 400);
    if (order.status === "COMPLETED") return c.json({ success: false, message: "Order already completed" }, 400);
    if (order.paymentQR?.isUsed) return c.json({ success: false, message: "QR already used" }, 400);

    // Expired Check
    if (decoded.paymentType === "CASH" && decoded.expiresAt) {
        if (new Date() > new Date(decoded.expiresAt)) {
             await prisma.paymentQR.update({ where: { orderId: order.id }, data: { isUsed: true } });
             return c.json({ success: false, message: "QR Expired" }, 400);
        }
    }

    return c.json({
        success: true,
        message: "QR Scanned",
        data: {
            // ... (keep your existing response structure here)
            paymentMethod: { type: decoded.paymentType, status: decoded.paymentStatus },
            customer: decoded.customer,
            orderSummary: decoded.orderSummary,
            orderInfo: { id: order.id, status: order.status },
        }
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// ADMIN: COMPLETE ORDER
// ==========================================
export const completeOrder = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.paymentType === "PAYNOW" && order.status !== "PAID") return c.json({ success: false, message: "Must be PAID" }, 400);

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED", completedAt: new Date(), paidAt: order.paidAt || new Date() },
      }),
      prisma.paymentQR.update({
        where: { orderId },
        data: { isUsed: true, expiresAt: new Date() },
      }),
    ]);

    // 🔄 Invalidate Cache
    await cache.invalidateOrders(orderId, order.userId);

    return c.json({ success: true, message: "Order completed" });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// ADMIN: REJECT ORDER
// ==========================================
export const rejectOrder = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    const { reason } = await c.req.json();

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { orderItems: true } });
    if (!order) return c.json({ success: false, message: "Order not found" }, 404);

    await prisma.$transaction(async (tx) => {
      // Restore stock
      if (order.status !== "CANCELLED") {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
      await tx.paymentQR.update({ where: { orderId }, data: { isUsed: true } });
    });

    // 🔄 Invalidate Caches
    await cache.invalidateOrders(orderId, order.userId);
    await cache.invalidateProducts();

    return c.json({ success: true, message: "Order rejected", data: { reason } });
  } catch (error) {
    return serverError(c, error);
  }
};