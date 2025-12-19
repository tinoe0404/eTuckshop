// src/routes/orders.route.ts
import { Hono } from "hono";
import {
  checkout,
  generateCashQR,
  initiatePayNow,
  processPayNowPayment,
  getOrderQR,
  getUserOrders,
  getUserOrdersGet,
  getOrderById,
  cancelOrder,
  getAllOrders,
  scanQRCode,
  completeOrder,
  rejectOrder,
  getOrderStats,
} from "../controllers/order.controller";

import {
  requireAuth,
  requireCustomer,
  requireAdmin,
} from "../middlewares/auth.middleware";

const router = new Hono();

/**
 * ======================================================
 * PUBLIC ROUTES (NO AUTH)
 * ======================================================
 */

// PayNow webhook/callback - must be BEFORE authenticated routes
router.get("/pay/paynow/process/:orderId", processPayNowPayment);

/**
 * ======================================================
 * ADMIN ROUTES (NextAuth - Admin only)
 * ======================================================
 * These MUST come before generic routes like "/:id"
 */

router.get(
  "/admin/all",
  requireAuth,
  requireAdmin,
  getAllOrders
);

router.get(
  "/admin/stats",
  requireAuth,
  requireAdmin,
  getOrderStats
);

router.post(
  "/admin/scan-qr",
  requireAuth,
  requireAdmin,
  scanQRCode
);

router.patch(
  "/admin/complete/:orderId",
  requireAuth,
  requireAdmin,
  completeOrder
);

router.patch(
  "/admin/reject/:orderId",
  requireAuth,
  requireAdmin,
  rejectOrder
);

/**
 * ======================================================
 * CUSTOMER ROUTES (NextAuth)
 * ======================================================
 */

// Checkout
router.post(
  "/checkout",
  requireAuth,
  requireCustomer,
  checkout
);

// Generate Cash QR
router.post(
  "/generate-qr/:orderId",
  requireAuth,
  requireCustomer,
  generateCashQR
);

// Initiate PayNow - Returns payment URL for frontend redirect
// IMPORTANT: This route path must match your frontend folder structure
// If frontend is /orders/payment/paynow/[orderId], change this to /payment/paynow/:orderId
router.get(
  "/pay/paynow/:orderId",
  requireAuth,
  requireCustomer,
  initiatePayNow
);

// Get Order QR Code
router.get(
  "/qr/:orderId",
  requireAuth,
  requireCustomer,
  getOrderQR
);

// Cancel Order
router.post(
  "/cancel/:orderId",
  requireAuth,
  requireCustomer,
  cancelOrder
);

// Get User Orders (GET method)
router.get(
  "/",
  requireAuth,
  requireCustomer,
  getUserOrdersGet
);

// Get User Orders (POST method - legacy support)
router.post(
  "/user-orders",
  requireAuth,
  requireCustomer,
  getUserOrders
);

// Get Order by ID - MUST be last to avoid conflicts
router.get(
  "/:id",
  requireAuth,
  requireCustomer,
  getOrderById
);

export default router;