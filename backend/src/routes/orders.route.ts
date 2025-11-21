import { Hono } from "hono";
import {
  checkout,
  getUserOrders,
  getOrderById,
  generateCashQR,
  generatePayNowQR,
  getPaymentStatus,
  cancelOrder,
  getAllOrders,
  getOrderByIdAdmin,
  approvePayment,
  completeOrder,
  rejectOrder,
  scanQRCode,
  getOrderStats,
} from "../controllers/order.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// ========== CUSTOMER ROUTES ==========
router.post("/checkout", protectRoute, checkout);
router.post("/pay/cash/:orderId", protectRoute, generateCashQR);
router.post("/pay/paynow/:orderId", protectRoute, generatePayNowQR);
router.get("/payment-status/:orderId", protectRoute, getPaymentStatus);
router.post("/cancel/:orderId", protectRoute, cancelOrder);

// ========== ADMIN ROUTES ==========
router.get("/admin/all", protectRoute, adminRoute, getAllOrders);
router.get("/admin/stats", protectRoute, adminRoute, getOrderStats);
router.get("/admin/:orderId", protectRoute, adminRoute, getOrderByIdAdmin);
router.patch("/admin/approve-payment/:orderId", protectRoute, adminRoute, approvePayment);
router.patch("/admin/complete/:orderId", protectRoute, adminRoute, completeOrder);
router.patch("/admin/reject/:orderId", protectRoute, adminRoute, rejectOrder);
router.post("/admin/scan-qr", protectRoute, adminRoute, scanQRCode);

// These routes with generic params should come LAST
router.get("/", protectRoute, getUserOrders);
router.get("/:id", protectRoute, getOrderById);

export default router;