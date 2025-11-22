import { Hono } from "hono";
import {
  twilioWebhook,
  twilioStatusCallback,
  handlePayNowSuccess,
  sendMessageToCustomer,
} from "../controllers/chatbot.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// ========== PUBLIC ROUTES (Twilio Webhooks) ==========
router.post("/webhook", twilioWebhook);
router.post("/status", twilioStatusCallback);
router.get("/paynow/success/:orderId", handlePayNowSuccess);

// ========== ADMIN ROUTES ==========
router.post("/send", protectRoute, adminRoute, sendMessageToCustomer);

export default router;
