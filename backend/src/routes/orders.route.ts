// src/routes/orders.route.ts
// FULL NEXTAUTH IMPLEMENTATION (CUSTOMER + ADMIN)

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
 * PAYNOW CALLBACK (PUBLIC)
 * ======================================================
 * Called by PayNow servers
 */
router.get("/pay/paynow/process/:orderId", processPayNowPayment);

/**
 * ======================================================
 * CUSTOMER ROUTES (NextAuth)
 * X-User-Id header REQUIRED
 * ======================================================
 */

router.post(
  "/checkout",
  requireAuth,
  requireCustomer,
  checkout
);

router.post(
  "/generate-qr/:orderId",
  requireAuth,
  requireCustomer,
  generateCashQR
);

router.get(
  "/pay/paynow/:orderId",
  requireAuth,
  requireCustomer,
  initiatePayNow
);

router.get(
  "/qr/:orderId",
  requireAuth,
  requireCustomer,
  getOrderQR
);

router.post(
  "/cancel/:orderId",
  requireAuth,
  requireCustomer,
  cancelOrder
);

// User orders (GET & POST supported)
router.get(
  "/",
  requireAuth,
  requireCustomer,
  getUserOrdersGet
);

router.post(
  "/user-orders",
  requireAuth,
  requireCustomer,
  getUserOrders
);

router.get(
  "/:id",
  requireAuth,
  requireCustomer,
  getOrderById
);

/**
 * ======================================================
 * ADMIN ROUTES (NextAuth)
 * requireAuth → requireAdmin
 * ======================================================
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

export default router;
