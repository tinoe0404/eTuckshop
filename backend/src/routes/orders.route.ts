// ============================================================
// src/routes/orders.route.ts
// ============================================================
import { Hono } from "hono";
import {
  checkout,
  generateCashQR,
  initiatePayNow,
  processPayNowPayment,
  getOrderQR,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  scanQRCode,
  completeOrder,
  rejectOrder,
  getOrderStats,
} from "../controllers/order.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// ========== PAYNOW CALLBACK (Public) ==========
router.get("/pay/paynow/process/:orderId", processPayNowPayment);

// ========== CUSTOMER ROUTES ==========
router.post("/checkout", protectRoute, checkout);
router.post("/generate-qr/:orderId", protectRoute, generateCashQR);
router.get("/pay/paynow/:orderId", protectRoute, initiatePayNow);
router.get("/qr/:orderId", protectRoute, getOrderQR);
router.post("/cancel/:orderId", protectRoute, cancelOrder);

// ========== ADMIN ROUTES ==========
router.get("/admin/all", protectRoute, adminRoute, getAllOrders);
router.get("/admin/stats", protectRoute, adminRoute, getOrderStats);
router.post("/admin/scan-qr", protectRoute, adminRoute, scanQRCode);
router.patch("/admin/complete/:orderId", protectRoute, adminRoute, completeOrder);
router.patch("/admin/reject/:orderId", protectRoute, adminRoute, rejectOrder);

// ========== CUSTOMER ROUTES (Generic - Must be last) ==========
router.get("/", protectRoute, getUserOrders);
router.get("/:id", protectRoute, getOrderById);

export default router;