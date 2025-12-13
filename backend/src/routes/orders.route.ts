import { Hono } from "hono";
import {
  checkout,
  generateCashQR,
  initiatePayNow,
  processPayNowPayment,
  getOrderQR,
  getUserOrders,
  getUserOrdersGet, // NEW function
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
router.post("/checkout", checkout);
router.post("/generate-qr/:orderId", generateCashQR);
router.get("/pay/paynow/:orderId", initiatePayNow);
router.get("/qr/:orderId", getOrderQR);
router.post("/cancel/:orderId", cancelOrder);

// Support both GET and POST for orders
router.get("/", getUserOrdersGet); // GET with userId query param
router.post("/user-orders", getUserOrders); // POST with userId in body

router.get("/:id", getOrderById);

// ========== ADMIN ROUTES ==========
router.get("/admin/all", protectRoute, adminRoute, getAllOrders);
router.get("/admin/stats", protectRoute, adminRoute, getOrderStats);
router.post("/admin/scan-qr", protectRoute, adminRoute, scanQRCode);
router.patch("/admin/complete/:orderId", protectRoute, adminRoute, completeOrder);
router.patch("/admin/reject/:orderId", protectRoute, adminRoute, rejectOrder);

export default router;