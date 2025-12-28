// src/routes/orders.route.ts
import { Hono } from "hono";
import {
  checkout,
  generateCashQR,
  initiatePayNow,
  processPayNowPayment,
  getOrderQR,
  getUserOrdersGet, // Using the new getter
  getUserOrders,    // Legacy alias
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

// PayNow webhook/callback
router.get("/pay/paynow/process/:orderId", processPayNowPayment);

/**
 * ======================================================
 * ADMIN ROUTES (NextAuth - Admin only)
 * ======================================================
 */

router.get("/admin/all", requireAuth, requireAdmin, getAllOrders);
router.get("/admin/stats", requireAuth, requireAdmin, getOrderStats);
router.post("/admin/scan-qr", requireAuth, requireAdmin, scanQRCode);
router.patch("/admin/complete/:orderId", requireAuth, requireAdmin, completeOrder);
router.patch("/admin/reject/:orderId", requireAuth, requireAdmin, rejectOrder);

/**
 * ======================================================
 * CUSTOMER ROUTES (NextAuth)
 * ======================================================
 */

router.post("/checkout", requireAuth, requireCustomer, checkout);
router.post("/generate-qr/:orderId", requireAuth, requireCustomer, generateCashQR);
router.get("/pay/paynow/:orderId", requireAuth, requireCustomer, initiatePayNow);
router.get("/qr/:orderId", requireAuth, requireCustomer, getOrderQR);
router.post("/cancel/:orderId", requireAuth, requireCustomer, cancelOrder);

// Get User Orders
router.get("/", requireAuth, requireCustomer, getUserOrdersGet);
router.post("/user-orders", requireAuth, requireCustomer, getUserOrders); // Legacy

// Get Order by ID - MUST be last
router.get("/:id", requireAuth, requireCustomer, getOrderById);

export default router;