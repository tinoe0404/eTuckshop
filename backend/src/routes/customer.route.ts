// src/routes/customer.route.ts
// NEXTAUTH IMPLEMENTATION (ADMIN ONLY)

import { Hono } from "hono";
import {
  getAllCustomers,
  getCustomerById,
  getCustomerStats,
  deleteCustomer,
} from "../controllers/customer.controller";

import {
  requireAuth,
  requireAdmin,
} from "../middlewares/auth.middleware";

const router = new Hono();

/**
 * ======================================================
 * ADMIN CUSTOMER ROUTES (NextAuth)
 * X-User-Id header REQUIRED
 * ======================================================
 */

// All routes require admin access
router.get(
  "/",
  requireAuth,
  requireAdmin,
  getAllCustomers
);

router.get(
  "/stats",
  requireAuth,
  requireAdmin,
  getCustomerStats
);

router.get(
  "/:id",
  requireAuth,
  requireAdmin,
  getCustomerById
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  deleteCustomer
);

export default router;
