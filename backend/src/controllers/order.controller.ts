// ============================================
// FILE: src/controllers/order.controller.ts (FINAL - ALL ERRORS FIXED)
// ============================================
// ✅ Integrates with Upstash Redis
// ✅ Fixed Prisma type errors (productId can be null)
// ✅ All TypeScript errors resolved

import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { generateQRCode, decodeQRData, QRPayload } from "../utils/qrCode";
import { redis, cache, getOrSetCache, TTL } from "../utils/redis";
import { validateRequest, CheckoutSchema, QRScanSchema } from "../utils/schema-validator";

// ============================================
// IDEMPOTENCY HELPERS (Using Upstash Redis)
// ============================================
const setIdempotencyKey = async (key: string, value: any, ttl: number = 60) => {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (e) {
    console.error('Redis setIdempotencyKey error:', e);
  }
};

const getIdempotencyKey = async (key: string) => {
  try {
    const v = await redis.get<string>(key);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
};

const generateOrderNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
};

const buildQRPayload = (order: any, expiresAt?: Date): QRPayload => ({
  orderId: order.id,
  orderNumber: order.orderNumber,
  paymentType: order.paymentType,
  paymentStatus: order.status === "PAID" ? "PAID" : "PENDING",
  customer: { name: order.user.name, email: order.user.email },
  orderSummary: {
    items: order.orderItems.map((i: any) => ({
      name: i.product.name,
      quantity: i.quantity,
      price: i.product.price,
      subtotal: i.subtotal
    })),
    totalItems: order.orderItems.reduce((s: number, i: any) => s + i.quantity, 0),
    totalAmount: order.totalAmount,
  },
  expiresAt: expiresAt?.toISOString(),
  paidAt: order.paidAt?.toISOString(),
  createdAt: new Date().toISOString(),
});

// ==========================================
// CREATE ORDER (Checkout)
// ==========================================
export const checkout = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ success: false, message: "Authentication required" }, 401);

    const body = await c.req.json().catch(() => ({}));
    const { paymentType } = validateRequest(CheckoutSchema, body);

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return c.json({ success: false, message: "Cart is empty" }, 400);
    }

    // ✅ CRITICAL FIX: Reserve stock immediately (for BOTH payment types)
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Check stock availability
      for (const item of cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, name: true }
        });

        if (!product || product.stock < item.quantity) {
          throw new Error(`${product?.name || 'Product'} is out of stock`);
        }
      }

      // 2. Deduct stock atomically (PREVENTS RACE CONDITION)
      await Promise.all(
        cart.items.map(item =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          })
        )
      );

      // 3. Create order
      let calculatedTotal = 0;
      const orderItemsData = cart.items.map((item) => {
        const price = Number(item.product.price);
        const subtotal = price * item.quantity;
        calculatedTotal += subtotal;

        return {
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          priceAtPurchase: price,
          subtotal
        };
      });

      const order = await tx.order.create({
        data: {
          userId: user.id,
          totalAmount: calculatedTotal,
          status: "PENDING",
          paymentType,
          orderItems: { create: orderItemsData }
        },
      });

      // 4. Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    }, {
      isolationLevel: 'Serializable', // Prevents concurrent modification
      maxWait: 10000, // Increased from 5s to 10s - wait longer for DB lock
      timeout: 25000  // Increased from 10s to 25s - checkout can take 7s+, needs buffer
    });

    // Invalidate caches
    await cache.invalidateProducts();
    await cache.invalidateOrders(newOrder.id, user.id);

    // Structured logging
    console.log(JSON.stringify({
      event: 'ORDER_CREATED',
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      userId: user.id,
      paymentType,
      totalAmount: Number(newOrder.totalAmount),
      stockReserved: true,
      timestamp: new Date().toISOString()
    }));

    return c.json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        totalAmount: newOrder.totalAmount,
        paymentType: newOrder.paymentType,
        status: newOrder.status,
        nextStep: {
          action: paymentType === 'PAYNOW' ? 'COMPLETE_PAYMENT' : 'GENERATE_QR',
          url: `/orders/${newOrder.id}`,
          note: paymentType === 'PAYNOW' ? 'Complete payment' : 'Generate QR code'
        }
      },
    });
  } catch (error: any) {
    if (error.message.includes("out of stock")) {
      return c.json({ success: false, message: error.message }, 400);
    }
    return serverError(c, error);
  }
};

export const generateCashQR = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { product: true } }
      },
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.paymentType !== "CASH") return c.json({ success: false, message: "Not a Cash order" }, 400);
    if (order.status !== "PENDING") return c.json({ success: false, message: `Order already ${order.status}` }, 400);

    // ✅ FIX: Check productId is not null before querying
    for (const item of order.orderItems) {
      if (!item.productId) {
        return c.json({ success: false, message: `Invalid product reference in order` }, 400);
      }

      const p = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true }
      });

      if (!p || p.stock < item.quantity) {
        return c.json({ success: false, message: `${p?.name || 'Product'} out of stock` }, 400);
      }
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const qrPayload = buildQRPayload(order, expiresAt);
    const qrCode = await generateQRCode(qrPayload);

    await prisma.paymentQR.upsert({
      where: { orderId: order.id },
      update: { qrCode, qrData: JSON.stringify(qrPayload), expiresAt, isUsed: false },
      create: {
        orderId: order.id,
        qrCode,
        qrData: JSON.stringify(qrPayload),
        paymentType: "CASH",
        expiresAt
      },
    });

    await cache.invalidateOrders(orderId);
    console.log(`🎫 Cash QR for ${order.orderNumber} - Expires ${expiresAt.toISOString()}`);

    return c.json({
      success: true,
      message: "QR generated",
      data: { qrCode, expiresAt, expiresIn: "900 seconds" }
    });
  } catch (error) {
    return serverError(c, error);
  }
};

export const initiatePayNow = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id }
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.paymentType !== "PAYNOW") return c.json({ success: false, message: "Not PayNow" }, 400);

    const paymentRef = `PAY-${order.orderNumber}-${Date.now().toString(36).toUpperCase()}`;

    await prisma.paymentQR.upsert({
      where: { orderId: order.id },
      update: { qrData: paymentRef, isUsed: false },
      create: {
        orderId: order.id,
        qrCode: "",
        qrData: paymentRef,
        paymentType: "PAYNOW"
      },
    });

    await cache.invalidateOrders(orderId);

    const origin = c.req.header('origin') || c.req.header('referer');
    let frontendUrl = 'http://localhost:3000';
    if (origin && !origin.includes('localhost')) {
      frontendUrl = new URL(origin).origin;
    } else if (process.env.CLIENT_URL) {
      frontendUrl = process.env.CLIENT_URL;
    }

    return c.json({
      success: true,
      data: {
        paymentRef,
        paymentUrl: `${frontendUrl}/orders/payment/paynow/${order.id}?ref=${paymentRef}`
      }
    });
  } catch (error) {
    return serverError(c, error);
  }
};

export const processPayNowPayment = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    const paymentRef = c.req.query("ref");

    if (!orderId || !paymentRef) {
      return c.json({ success: false, message: "Invalid Request" }, 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: { include: { product: true } },
        paymentQR: true
      },
    });

    if (!order || !order.paymentQR) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }
    if (order.paymentQR.qrData !== paymentRef) {
      return c.json({ success: false, message: "Invalid Ref" }, 400);
    }

    if (order.status === "PAID" && order.paymentQR.qrCode) {
      console.log(`ℹ️ Order ${order.orderNumber} already paid`);
      return c.json({
        success: true,
        message: "Already Paid",
        data: { qrCode: order.paymentQR.qrCode }
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // ✅ FIX: Check stock with null safety
      for (const item of order.orderItems) {
        if (!item.productId) {
          throw new Error(`Invalid product reference in order`);
        }

        const p = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, name: true }
        });

        if (!p || p.stock < item.quantity) {
          throw new Error(`${p?.name || 'Product'} out of stock`);
        }
      }

      // ✅ DEDUCT STOCK for PAYNOW (with null check)
      await Promise.all(
        order.orderItems
          .filter(i => i.productId !== null)
          .map(i =>
            tx.product.update({
              where: { id: i.productId! },
              data: { stock: { decrement: i.quantity } }
            })
          )
      );

      const qrPayload: QRPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType: "PAYNOW",
        paymentStatus: "PAID",
        customer: { name: order.user.name || 'Guest', email: order.user.email || 'no-email@etuckshop.com' },
        orderSummary: {
          items: order.orderItems.map((i: any) => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
            subtotal: i.subtotal
          })),
          totalItems: order.orderItems.reduce((s: number, i: any) => s + i.quantity, 0),
          totalAmount: order.totalAmount,
        },
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const qrCode = await generateQRCode(qrPayload);

      await tx.order.update({
        where: { id: orderId },
        data: { status: "PAID", paidAt: new Date() }
      });

      await tx.paymentQR.update({
        where: { orderId },
        data: {
          qrCode,
          qrData: JSON.stringify(qrPayload),
          expiresAt: null,
          isUsed: false
        }
      });

      return qrCode;
    }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });

    await cache.invalidateOrders(orderId, order.userId);
    await cache.invalidateProducts();

    console.log(`💰 PayNow payment for ${order.orderNumber} - Stock deducted`);

    return c.json({
      success: true,
      message: "Payment successful",
      data: { qrCode: result }
    });
  } catch (error: any) {
    if (error.message.includes("out of stock")) {
      return c.json({ success: false, message: error.message }, 400);
    }
    return serverError(c, error);
  }
};

export const getUserOrdersGet = async (c: Context) => {
  try {
    const userId = Number(c.req.query('userId') || (c.get('user') as any)?.id);
    if (!userId) return c.json({ success: false, message: 'User ID required' }, 400);

    const orders = await getOrSetCache(`orders:user:${userId}`, async () => {
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

export const getUserOrders = async (c: Context) => getUserOrdersGet(c);

export const getOrderById = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("id"));
    const userId = c.req.query("userId");
    if (!userId) return c.json({ success: false, message: "User ID required" }, 400);

    const order = await getOrSetCache(`orders:detail:${orderId}`, async () => {
      return await prisma.order.findFirst({
        where: { id: orderId, userId: parseInt(userId) },
        include: {
          orderItems: { include: { product: true } },
          paymentQR: {
            select: {
              qrCode: true,
              expiresAt: true,
              isUsed: true,
              paymentType: true
            }
          },
        },
      });
    }, TTL.ORDER_DETAIL);

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    return c.json({ success: true, data: order });
  } catch (error) {
    return serverError(c, error);
  }
};

export const getOrderQR = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentQR: true }
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
      data: { ...payload, qrCode: order.paymentQR.qrCode }
    });
  } catch (error) {
    return serverError(c, error);
  }
};

export const cancelOrder = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: { orderItems: { include: { product: true } } }
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.status !== "PENDING" && order.status !== "PAID") {
      return c.json({ success: false, message: "Cannot cancel" }, 400);
    }

    await prisma.$transaction(async (tx) => {
      // ✅ CHANGE: Always restore stock (since we now deduct on checkout regardless of payment type)
      for (const item of order.orderItems) {
        if (item.productId !== null) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });
    });

    // Invalidate caches
    await cache.invalidateOrders(orderId, user.id);
    await cache.invalidateProducts();

    // ✅ NEW: Broadcast stock updates via SSE
    try {
      const { broadcastStockUpdate } = await import('../sse-server');
      for (const item of order.orderItems) {
        if (item.productId !== null && item.product) {
          const updatedProduct = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { stock: true }
          });
          if (updatedProduct) {
            broadcastStockUpdate(item.productId, updatedProduct.stock, item.product.name);
          }
        }
      }
    } catch (error) {
      console.error('Failed to broadcast stock update:', error);
    }

    // Structured logging
    console.log(JSON.stringify({
      event: 'ORDER_CANCELLED',
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: user.id,
      paymentType: order.paymentType,
      stockRestored: true,
      timestamp: new Date().toISOString()
    }));

    return c.json({ success: true, message: "Order cancelled" });
  } catch (error) {
    return serverError(c, error);
  }
};

export const rejectOrder = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    const { reason } = await c.req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true }
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);

    await prisma.$transaction(async (tx) => {
      // ✅ FIX: Only restore stock for PAYNOW with null check
      if (order.paymentType === "PAYNOW" && order.status === "PAID") {
        for (const item of order.orderItems) {
          if (item.productId !== null) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });
          }
        }
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });
      const qr = await tx.paymentQR.findUnique({ where: { orderId } });
      if (qr) {
        await tx.paymentQR.update({
          where: { orderId },
          data: { isUsed: true }
        });
      }
    });

    await cache.invalidateOrders(orderId, order.userId);
    if (order.paymentType === "PAYNOW" && order.status === "PAID") {
      await cache.invalidateProducts();
    }

    return c.json({ success: true, message: "Order rejected", data: { reason } });
  } catch (error) {
    return serverError(c, error);
  }
};

export const getAllOrders = async (c: Context) => {
  try {
    const { status, paymentType, page = "1", limit = "10" } = c.req.query();
    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (paymentType) where.paymentType = paymentType.toUpperCase();

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          orderItems: { include: { product: true } }
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
          totalPages: Math.ceil(total / parseInt(limit))
        }
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

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
          _sum: { totalAmount: true }
        }),
      ]);
      return {
        orders: { total, pending, paid, completed, cancelled },
        revenue: revenue._sum.totalAmount || 0
      };
    }, TTL.STATS);

    return c.json({ success: true, data: stats });
  } catch (error) {
    return serverError(c, error);
  }
};

export const scanQRCode = async (c: Context) => {
  try {
    const { qrData } = await c.req.json();

    const MAX_QR_LENGTH = 10000;
    if (!qrData || typeof qrData !== 'string' || qrData.length > MAX_QR_LENGTH) {
      return c.json({ success: false, message: "Invalid QR data" }, 400);
    }

    const decoded = decodeQRData(qrData);
    if (!decoded) {
      return c.json({ success: false, message: "Invalid QR format" }, 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: decoded.orderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: { include: { product: true } },
        paymentQR: true
      },
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);
    if (order.orderNumber !== decoded.orderNumber) {
      return c.json({ success: false, message: "QR mismatch" }, 400);
    }
    if (order.status === "COMPLETED") {
      return c.json({ success: false, message: "Already completed" }, 400);
    }
    if (order.status === "CANCELLED") {
      return c.json({ success: false, message: "Cancelled" }, 400);
    }
    if (order.paymentQR?.isUsed) {
      return c.json({ success: false, message: "QR already used" }, 400);
    }

    if (decoded.paymentType === "CASH" && decoded.expiresAt) {
      const expiryDate = new Date(decoded.expiresAt);
      const now = new Date();

      if (now > expiryDate) {
        const gracePeriodMs = 60 * 1000;
        if (now.getTime() - expiryDate.getTime() > gracePeriodMs) {
          return c.json({
            success: false,
            message: "QR expired. Regenerate needed."
          }, 400);
        }
      }

      const newExpiry = new Date(Date.now() + 5 * 60 * 1000);
      await prisma.paymentQR.update({
        where: { orderId: order.id },
        data: { expiresAt: newExpiry }
      });
      console.log(`🕐 Extended QR for ${order.orderNumber}`);
    }

    if (decoded.paymentType === "PAYNOW" && order.status !== "PAID") {
      return c.json({
        success: false,
        message: "Payment not completed"
      }, 400);
    }

    const formatCurrency = (a: number) => `$${a.toFixed(2)}`;

    return c.json({
      success: true,
      message: "QR verified",
      data: {
        paymentMethod: {
          type: decoded.paymentType,
          label: decoded.paymentType === 'CASH' ? 'Cash' : 'PayNow',
          status: decoded.paymentStatus
        },
        customer: decoded.customer,
        orderSummary: decoded.orderSummary,
        orderInfo: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          paidAt: order.paidAt?.toISOString() || null
        },
        instructions: decoded.paymentType === 'CASH'
          ? `Collect ${formatCurrency(decoded.orderSummary.totalAmount)} cash`
          : 'Online payment completed',
        action: { complete: `/api/orders/admin/complete/${order.id}` }
      }
    });
  } catch (error) {
    return serverError(c, error);
  }
};

export const completeOrder = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    const idempotencyKey = c.req.header('x-idempotency-key') || `complete-${orderId}-${Date.now()}`;

    if (isNaN(orderId) || orderId <= 0) {
      return c.json({ success: false, message: "Invalid order ID" }, 400);
    }

    // 1. Check Idempotency (Prevent double processing)
    const existing = await getIdempotencyKey(`order:complete:${idempotencyKey}`);
    if (existing) {
      console.log(`ℹ️ Duplicate request for ${orderId} - Returning cached response`);
      return c.json(existing, 200);
    }

    // 2. Fetch Order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        paymentQR: true,
        orderItems: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!order) return c.json({ success: false, message: "Order not found" }, 404);

    // 3. Handle Already Completed (Idempotency Backup)
    if (order.status === "COMPLETED") {
      const response = {
        success: true,
        message: "Already completed",
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          completedAt: order.completedAt?.toISOString()
        }
      };
      await setIdempotencyKey(`order:complete:${idempotencyKey}`, response, 300);
      return c.json(response, 200);
    }

    // 4. Validate Status
    if (order.status === "CANCELLED") {
      return c.json({ success: false, message: "Cannot complete cancelled order" }, 400);
    }
    if (order.paymentType === "PAYNOW" && order.status !== "PAID") {
      return c.json({ success: false, message: "Payment not complete" }, 400);
    }
    if (order.paymentType === "CASH" && order.status !== "PENDING") {
      return c.json({ success: false, message: "Cash orders must be PENDING" }, 400);
    }
    if (!order.paymentQR) {
      return c.json({ success: false, message: "No QR Code generated for this order" }, 404);
    }

    // 5. Execute Database Transaction
    const completedOrder = await prisma.$transaction(async (tx) => {
      // ✅ CHANGE: No stock deduction needed (already done in checkout)
      // Just update order status

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          paidAt: order.paidAt || new Date()
        },
      });

      // Update QR Status
      await tx.paymentQR.update({
        where: { orderId },
        data: { isUsed: true, expiresAt: new Date() }
      });

      return updated;
    }, {
      isolationLevel: 'ReadCommitted',
      maxWait: 5000,
      timeout: 10000
    });

    // 6. Construct Response
    const response = {
      success: true,
      message: "Order completed successfully",
      data: {
        orderId: completedOrder.id,
        orderNumber: completedOrder.orderNumber,
        status: completedOrder.status,
        completedAt: completedOrder.completedAt?.toISOString()
      }
    };

    // 7. Safe Side Effects (Try/Catch ensures success response is sent even if cache/SSE fails)
    try {
      await setIdempotencyKey(`order:complete:${idempotencyKey}`, response, 300);
      await cache.invalidateOrders(orderId, order.userId);

      // ✅ NEW: Broadcast order update via SSE
      const { broadcastOrderUpdate } = await import('../sse-server');
      broadcastOrderUpdate(orderId, 'COMPLETED', order.userId);
    } catch (sideEffectError) {
      console.error("⚠️ Order completed, but cache/SSE failed:", sideEffectError);
    }

    // 8. Structured Logging
    const adminUser = c.get('user');
    console.log(JSON.stringify({
      event: 'ORDER_COMPLETED',
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentType: order.paymentType,
      totalAmount: Number(order.totalAmount),
      customerId: order.userId,
      customerName: order.user.name || 'Unknown',
      adminId: adminUser?.id,
      adminName: adminUser?.name || 'System',
      items: order.orderItems.map(i => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity
      })),
      timestamp: new Date().toISOString()
    }));

    return c.json(response, 200);

  } catch (error: any) {
    console.error(JSON.stringify({
      event: 'ORDER_COMPLETION_ERROR',
      orderId: c.req.param("orderId"),
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }));
    return serverError(c, error);
  }
};