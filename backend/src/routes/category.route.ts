// src/routes/category.route.ts
// NEXTAUTH IMPLEMENTATION (PUBLIC + ADMIN)

import { Hono } from "hono";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
} from "../controllers/category.controller";

import {
  requireAuth,
  requireAdmin,
} from "../middlewares/auth.middleware";

const router = new Hono();

/**
 * ======================================================
 * PUBLIC ROUTES
 * ======================================================
 */

// Anyone can view categories
router.get("/", getAllCategories);

/**
 * ======================================================
 * ADMIN ROUTES (NextAuth)
 * IMPORTANT: specific routes BEFORE dynamic routes
 * ======================================================
 */

// Admin-only stats route (must come BEFORE /:id)
router.get(
  "/admin/stats",
  requireAuth,
  requireAdmin,
  getCategoryStats
);

/**
 * ======================================================
 * PUBLIC DYNAMIC ROUTE
 * ======================================================
 */

// Get category by ID
router.get("/:id", getCategoryById);

/**
 * ======================================================
 * ADMIN CRUD ROUTES (NextAuth)
 * ======================================================
 */

router.post(
  "/",
  requireAuth,
  requireAdmin,
  createCategory
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  updateCategory
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  deleteCategory
);

export default router;
