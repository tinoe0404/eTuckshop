// src/routes/analytics.route.ts
import { Hono } from "hono";
import {
  getAnalytics,
  getDashboardStats,
} from "../controllers/analytics.controller";
import {
  requireAuth,
  requireAdmin,
} from "../middlewares/auth.middleware";

const router = new Hono();

router.get("/", requireAuth, requireAdmin, getAnalytics);
router.get("/dashboard", requireAuth, requireAdmin, getDashboardStats);

export default router;