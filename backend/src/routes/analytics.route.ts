import { Hono } from "hono";
import { getAnalytics, getDashboardStats } from "../controllers/analytics.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// Admin only routes
router.get("/", protectRoute, adminRoute, getAnalytics);
router.get("/dashboard", protectRoute, adminRoute, getDashboardStats);

export default router;