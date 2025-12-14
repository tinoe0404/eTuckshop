// src/routes/analytics.route.ts - FIXED

import { Hono } from "hono";
import { getAnalytics, getDashboardStats } from "../controllers/analytics.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// ✅ KEEP admin protection - analytics should be admin-only
router.get("/", protectRoute, adminRoute, getAnalytics);
router.get("/dashboard", protectRoute, adminRoute, getDashboardStats);

export default router;