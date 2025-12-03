import { Hono } from "hono";
import { getAnalytics } from "../controllers/analytics.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// Admin only route
router.get("/", protectRoute, adminRoute, getAnalytics);

export default router;