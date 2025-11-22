import { Context } from "hono";
import { prisma } from "../utils/db";
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
    const user = c.get("user");
    const { paymentType = "CASH" } = await c.req.json();

    if (!["CASH", "PAYNOW"].includes(paymentType)) {
      return c.json({ success: false, message: "Invalid payment type" }, 400);
    }

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return c.json({ success: false, message: "Cart is empty" }, 400);
    }

    // Validate stock
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return c.json({
          success: false,
          message: `Insufficient stock for ${item.product.name}`,
        }, 400);
      }
    }

    // Calculate total
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity, 0
    );

    // Create order
    const order = await prisma.$transaction(async (tx) => {
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
          orderItems: { include: { product: true } },
        },
      });

      // Reduce stock
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    // Response based on payment type
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
        note: "QR code expires in 1 minute",
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
    return serverError(c, error);
  }
};

// ==========================================
// GENERATE QR CODE FOR CASH PAYMENT
// (Expires in 1 minute)
// ==========================================
export const generateCashQR = async (c: Context) => {
  try {
    const user = c.get("user");
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
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

    // Set 1 minute expiry
    const expiresAt = new Date(Date.now() + 60 * 1000);

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
      message: "Cash QR code generated (expires in 1 minute)",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType: "CASH",
        paymentStatus: "PENDING",
        customer: qrPayload.customer,
        orderSummary: qrPayload.orderSummary,
        qrCode,
        expiresAt,
        expiresIn: "60 seconds",
      },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ==========================================
// INITIATE PAYNOW PAYMENT
// (Returns payment link)
// ==========================================
export const initiatePayNow = async (c: Context) => {
  try {
    const user = c.get("user");
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

    // TODO: Replace with real PayNow payment gateway URL
    // Example: Stripe, PayNow Singapore API, etc.
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
// GET ORDER QR CODE
// ==========================================
export const getOrderQR = async (c: Context) => {
  try {
    const user = c.get("user");
    const orderId = Number(c.req.param("orderId"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
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
    const user = c.get("user");

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
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
export const getOrderById = async (c: Context) => {
  try {
    const user = c.get("user");
    const orderId = Number(c.req.param("id"));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
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
// CANCEL ORDER
// ==========================================
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