// src/routes/analytics.route.ts
// FULL NEXTAUTH IMPLEMENTATION (ADMIN ONLY)

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

/**
 * ======================================================
 * ADMIN ANALYTICS ROUTES (NextAuth)
 * X-User-Id header REQUIRED
 * ======================================================
 */

router.get(
  "/",
  requireAuth,
  requireAdmin,
  getAnalytics
);

router.get(
  "/dashboard",
  requireAuth,
  requireAdmin,
  getDashboardStats
);

export default router;
