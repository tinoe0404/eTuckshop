// src/routes/product.route.ts
import { Hono } from "hono";
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";

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

// Anyone can view products
router.get("/", getAllProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/:id", getProductById);

/**
 * ======================================================
 * ADMIN ROUTES (NextAuth)
 * X-User-Id header REQUIRED
 * ======================================================
 */

router.post(
  "/",
  requireAuth,
  requireAdmin,
  createProduct
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  updateProduct
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  deleteProduct
);

export default router;