import { Context } from "hono";
import { prisma } from "../utils/prisma";
import { serverError } from "../utils/serverError";
import { generateQRCode, decodeQRData, QRPayload } from "../utils/qrCode";

// Helper: Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// Helper: Build QR payload from order
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
// CHECKOUT - CREATE ORDER FROM CART
// ==========================================
export const checkout = async (c: Context) => {
  try {
    const user = c.get('user');
    const { paymentType = "CASH" } = await c.req.json();

    if (!user) {
      return c.json({
        success: false,
        message: "Authentication required"
      }, 401);
    }

    if (!["CASH", "PAYNOW"].includes(paymentType)) {
      return c.json({ success: false, message: "Invalid payment type" }, 400);
    }

    // 1. Get cart OUTSIDE transaction
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return c.json({ success: false, message: "Cart is empty" }, 400);
    }

    // 2. Validate stock OUTSIDE transaction
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return c.json({
          success: false,
          message: `Insufficient stock for ${item.product.name}`,
        }, 400);
      }
    }

    // 3. Calculate total OUTSIDE transaction
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity, 0
    );

    // 4. Generate order number OUTSIDE transaction
    const orderNumber = generateOrderNumber();

    // 5. Prepare order items data OUTSIDE transaction
    const orderItemsData = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      subtotal: parseFloat((item.product.price * item.quantity).toFixed(2)),
    }));

    // 6. Prepare stock updates OUTSIDE transaction
    const stockUpdates = cart.items.map((item) => ({
      id: item.productId,
      quantity: item.quantity,
    }));

    // 7. NOW run the transaction with ONLY database writes
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          paymentType,
          status: "PENDING",
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: { include: { product: true } },
        },
      });

      // Update stock for all products
      await Promise.all(
        stockUpdates.map((update) =>
          tx.product.update({
            where: { id: update.id },
            data: { stock: { decrement: update.quantity } },
          })
        )
      );

      // Clear cart items
      await tx.cartItem.deleteMany({ 
        where: { cartId: cart.id } 
      });

      return newOrder;
    }, {
      maxWait: 5000, // Wait up to 5s for transaction to start
      timeout: 10000, // Transaction timeout after 10s
    });

    // 8. Build response OUTSIDE transaction
    const response: any = {
      success: true,
      message: "Order created successfully",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentType: order.paymentType,
        status: order.status,
        orderItems: order.orderItems,
      },
    };

    if (paymentType === "CASH") {
      response.data.nextStep = {
        action: "Generate QR Code",
        url: `/api/orders/generate-qr/${order.id}`,
        note: "QR code expires in 15 minutes",
      };
    } else {
      response.data.nextStep = {
        action: "Complete PayNow Payment",
        url: `/api/orders/pay/paynow/${order.id}`,
        note: "After payment, QR code will be generated automatically",
      };
    }

    return c.json(response, 201);
  } catch (error) {
    console.error("Checkout error:", error);
    return serverError(c, error);
  }
};
// ==========================================
// GENERATE QR CODE FOR CASH PAYMENT (FIXED - No auth required)
// ==========================================
export const generateCashQR = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: parseInt(user) },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { product: true } },
      },
    });

    if (!order) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }

    if (order.paymentType !== "CASH") {
      return c.json({ success: false, message: "This is not a Cash order" }, 400);
    }

    if (order.status !== "PENDING") {
      return c.json({ success: false, message: `Order already ${order.status.toLowerCase()}` }, 400);
    }

    // Set 15 minute expiry
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Build QR payload
    const qrPayload = buildQRPayload(order, expiresAt);
    const qrCode = await generateQRCode(qrPayload);

    // Save QR to database
    await prisma.paymentQR.upsert({
      where: { orderId: order.id },
      update: { qrCode, qrData: JSON.stringify(qrPayload), expiresAt, isUsed: false },
      create: { orderId: order.id, qrCode, qrData: JSON.stringify(qrPayload), paymentType: "CASH", expiresAt },
    });

    return c.json({
      success: true,
      message: "Cash QR code generated (expires in 15 minutes)",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType: "CASH",
        paymentStatus: "PENDING",
        customer: qrPayload.customer,
        orderSummary: qrPayload.orderSummary,
        qrCode,
        expiresAt,
        expiresIn: "900 seconds", // 15 minutes = 900 seconds
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// INITIATE PAYNOW PAYMENT (FIXED - No auth required)
// ==========================================
export const initiatePayNow = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
    });

    if (!order) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }

    if (order.paymentType !== "PAYNOW") {
      return c.json({ success: false, message: "This is not a PayNow order" }, 400);
    }

    if (order.status !== "PENDING") {
      return c.json({ success: false, message: `Order already ${order.status.toLowerCase()}` }, 400);
    }

    // Generate payment reference
    const paymentRef = `PAY-${order.orderNumber}-${Date.now().toString(36).toUpperCase()}`;

    // Save payment reference
    await prisma.paymentQR.upsert({
      where: { orderId: order.id },
      update: { qrData: paymentRef, isUsed: false },
      create: { orderId: order.id, qrCode: "", qrData: paymentRef, paymentType: "PAYNOW" },
    });

    const paymentUrl = `${process.env.BASE_URL || "http://localhost:5000"}/api/orders/pay/paynow/process/${order.id}?ref=${paymentRef}`;

    return c.json({
      success: true,
      message: "PayNow payment initiated",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        currency: "USD",
        paymentRef,
        paymentUrl,
        instructions: "Complete payment using the link. QR code will be generated after successful payment.",
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// PROCESS PAYNOW PAYMENT (Mock/Webhook)
// After payment success → Generate QR
// ==========================================
export const processPayNowPayment = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    const paymentRef = c.req.query("ref");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { product: true } },
        paymentQR: true,
      },
    });

    if (!order) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }

    // Verify payment reference
    if (order.paymentQR?.qrData !== paymentRef) {
      return c.json({ success: false, message: "Invalid payment reference" }, 400);
    }

    if (order.status === "PAID") {
      return c.json({ success: false, message: "Order already paid" }, 400);
    }

    // Build QR payload (no expiry for PayNow)
    const qrPayload = buildQRPayload({ ...order, status: "PAID", paidAt: new Date() });
    const qrCode = await generateQRCode(qrPayload);

    // Update order to PAID and save QR
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

    return c.json({
      success: true,
      message: "Payment successful! QR code generated.",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType: "PAYNOW",
        paymentStatus: "PAID",
        customer: qrPayload.customer,
        orderSummary: qrPayload.orderSummary,
        qrCode,
        paidAt: new Date().toISOString(),
        expiresAt: null,
        note: "Show this QR to admin for pickup. Expires when order is completed.",
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// GET ORDER QR CODE (FIXED - No auth required)
// ==========================================
export const getOrderQR = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));
    const userId = c.req.query("userId"); // Get from query param

    if (!userId) {
      return c.json({
        success: false,
        message: "User ID is required"
      }, 400);
    }

    const order = await prisma.order.findFirst({
      where: { 
        id: orderId, 
        userId: parseInt(userId) 
      },
      include: { paymentQR: true },
    });

    if (!order) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }

    if (!order.paymentQR?.qrCode) {
      return c.json({ success: false, message: "QR code not generated yet" }, 400);
    }

    // Check if Cash QR expired
    if (order.paymentType === "CASH" && order.paymentQR.expiresAt) {
      if (new Date() > order.paymentQR.expiresAt) {
        return c.json({
          success: false,
          message: "QR code expired. Generate a new one.",
          data: { generateUrl: `/api/orders/generate-qr/${orderId}` },
        }, 400);
      }
    }

    const qrPayload = JSON.parse(order.paymentQR.qrData);

    return c.json({
      success: true,
      message: "QR code retrieved",
      data: {
        ...qrPayload,
        qrCode: order.paymentQR.qrCode,
        isUsed: order.paymentQR.isUsed,
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// GET USER ORDERS
// ==========================================
export const getUserOrders = async (c: Context) => {
  try {
    const { userId } = await c.req.json();

    if (!userId) {
      return c.json({
        success: false,
        message: "User ID is required"
      }, 400);
    }

    const orders = await prisma.order.findMany({
      where: { userId: parseInt(userId) },
      include: { orderItems: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      message: "Orders retrieved",
      data: orders,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// GET ORDER BY ID
// ==========================================
// ==========================================
// GET ORDER BY ID (FIXED - No auth required)
// ==========================================
export const getOrderById = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("id"));
    const userId = c.req.query("userId"); // Get from query param

    if (!userId) {
      return c.json({
        success: false,
        message: "User ID is required"
      }, 400);
    }

    const order = await prisma.order.findFirst({
      where: { 
        id: orderId, 
        userId: parseInt(userId) 
      },
      include: {
        orderItems: { include: { product: true } },
        paymentQR: { select: { expiresAt: true, isUsed: true, paymentType: true } },
      },
    });

    if (!order) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }

    return c.json({ success: true, data: order });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// CANCEL ORDER (FIXED - No auth required)
// ==========================================
export const cancelOrder = async (c: Context) => {
  try {
    const user = c.get('user');
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: { orderItems: true },
    });

    if (!order) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }

    if (order.status !== "PENDING") {
      return c.json({ success: false, message: "Only pending orders can be cancelled" }, 400);
    }

    // Restore stock and cancel
    await prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    });

    return c.json({ success: true, message: "Order cancelled" });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// ADMIN: GET ALL ORDERS
// ==========================================
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
// ADMIN: SCAN QR CODE (FIXED)
// ==========================================
export const scanQRCode = async (c: Context) => {
  try {
    const { qrData } = await c.req.json();

    if (!qrData) {
      return c.json({ 
        success: false, 
        message: "QR data required" 
      }, 400);
    }

    console.log('Received QR data:', qrData.substring(0, 100) + '...');

    // Decode QR data
    const decoded = decodeQRData(qrData);
    
    if (!decoded) {
      return c.json({ 
        success: false, 
        message: "Invalid QR code - unable to decode data" 
      }, 400);
    }

    console.log('Decoded QR payload:', { 
      orderId: decoded.orderId, 
      orderNumber: decoded.orderNumber 
    });

    // Fetch order from database
    const order = await prisma.order.findUnique({
      where: { id: decoded.orderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: { include: { product: true } },
        paymentQR: true,
      },
    });

    if (!order) {
      return c.json({ 
        success: false, 
        message: "Order not found in database" 
      }, 404);
    }

    // Verify order number matches
    if (order.orderNumber !== decoded.orderNumber) {
      return c.json({ 
        success: false, 
        message: "Order number mismatch - QR code may be invalid" 
      }, 400);
    }

    // Check if already completed
    if (order.status === "COMPLETED") {
      return c.json({
        success: false,
        message: "Order already completed",
        data: { 
          orderId: order.id, 
          status: "COMPLETED", 
          completedAt: order.completedAt 
        },
      }, 400);
    }

    // Check if QR already used
    if (order.paymentQR?.isUsed) {
      return c.json({ 
        success: false, 
        message: "QR code already used" 
      }, 400);
    }

    // Check expiry for CASH orders
    if (decoded.paymentType === "CASH" && decoded.expiresAt) {
      const expiryDate = new Date(decoded.expiresAt);
      const now = new Date();
      
      if (now > expiryDate) {
        // Mark QR as expired
        await prisma.paymentQR.update({
          where: { orderId: order.id },
          data: { isUsed: true },
        });
        
        return c.json({
          success: false,
          message: "Cash QR expired (15 minute limit)",
          data: { 
            suggestion: "Customer needs to generate new QR code",
            expiredAt: expiryDate.toISOString(),
            expiredMinutesAgo: Math.floor((now.getTime() - expiryDate.getTime()) / 60000)
          },
        }, 400);
      }
    }

    // Build response based on payment type
    const response: any = {
      success: true,
      message: "QR scanned successfully",
      data: {
        paymentMethod: {
          type: decoded.paymentType,
          label: decoded.paymentType === "PAYNOW" 
            ? "💳 PayNow (Paid Online)" 
            : "💵 Cash (Pay at Counter)",
          status: decoded.paymentStatus,
        },
        customer: {
          name: decoded.customer.name,
          email: decoded.customer.email,
        },
        orderSummary: {
          items: decoded.orderSummary.items,
          totalItems: decoded.orderSummary.totalItems,
          totalAmount: decoded.orderSummary.totalAmount,
        },
        orderInfo: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          paidAt: order.paidAt?.toISOString() || null,
        },
      },
    };

    // Instructions based on payment type
    if (decoded.paymentType === "PAYNOW") {
      if (order.status !== "PAID") {
        return c.json({
          success: false,
          message: "PayNow order not yet paid",
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            suggestion: "Payment must be completed before pickup"
          }
        }, 400);
      }
      
      response.data.instructions = "✅ Payment confirmed. Hand over items and mark complete.";
      response.data.action = { complete: `/api/orders/admin/complete/${order.id}` };
    } else {
      // CASH payment
      response.data.instructions = "💵 Collect cash payment, then mark complete.";
      response.data.action = { complete: `/api/orders/admin/complete/${order.id}` };
      
      // Add expiry info if available
      if (decoded.expiresAt) {
        const expiryDate = new Date(decoded.expiresAt);
        const minutesRemaining = Math.floor((expiryDate.getTime() - Date.now()) / 60000);
        response.data.expiryInfo = {
          expiresAt: decoded.expiresAt,
          minutesRemaining: Math.max(0, minutesRemaining),
        };
      }
    }

    return c.json(response);
  } catch (error) {
    console.error('Scan QR error:', error);
    return serverError(c, error);
  }
};

// ==========================================
// ADMIN: MARK ORDER COMPLETE (QR Expires)
// ==========================================
export const completeOrder = async (c: Context) => {
  try {
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentQR: true },
    });

    if (!order) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }

    // PayNow must be PAID, Cash can be PENDING
    if (order.paymentType === "PAYNOW" && order.status !== "PAID") {
      return c.json({ success: false, message: "PayNow order must be paid first" }, 400);
    }

    if (order.status === "COMPLETED") {
      return c.json({ success: false, message: "Order already completed" }, 400);
    }

    // Complete order and expire QR
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          paidAt: order.paidAt || new Date(),
          completedAt: new Date(),
        },
      }),
      prisma.paymentQR.update({
        where: { orderId },
        data: { isUsed: true, expiresAt: new Date() },
      }),
    ]);

    return c.json({
      success: true,
      message: "Order completed. QR code expired.",
      data: {
        orderId,
        status: "COMPLETED",
        completedAt: new Date(),
        qrStatus: "EXPIRED",
      },
    });
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

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        orderItems: true,
        paymentQR: true
      },
    });

    if (!order) {
      return c.json({ success: false, message: "Order not found" }, 404);
    }

    if (order.status === "COMPLETED") {
      return c.json({ success: false, message: "Cannot reject completed order" }, 400);
    }

    // Restore stock and reject
    await prisma.$transaction(async (tx) => {
      if (order.status !== "CANCELLED") {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
      if (order.paymentQR) {
        await tx.paymentQR.update({ where: { orderId }, data: { isUsed: true } });
      }
    });

    return c.json({
      success: true,
      message: "Order rejected",
      data: { orderId, status: "CANCELLED", reason: reason || "Rejected by admin" },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// ADMIN: GET ORDER STATS
// ==========================================
export const getOrderStats = async (c: Context) => {
  try {
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

    return c.json({
      success: true,
      data: {
        orders: { total, pending, paid, completed, cancelled },
        revenue: revenue._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

export const getUserOrdersGet = async (c: Context) => {
  try {
    const userId = c.req.query('userId');

    if (!userId) {
      return c.json(
        { success: false, message: 'User ID is required' },
        400
      );
    }

    const orders = await prisma.order.findMany({
      where: { userId: Number(userId) },
      include: {
        orderItems: { include: { product: true } },
        paymentQR: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({
      success: true,
      message: 'Orders retrieved',
      data: orders,
    });
  } catch (error) {
    return serverError(c, error);
  }
};
