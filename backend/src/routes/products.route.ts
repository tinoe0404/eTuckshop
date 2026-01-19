// src/routes/product.route.ts
import { Hono } from "hono";
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
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
router.get("/", getAllProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/:id", getProductById);

/**
 * ======================================================
 * ADMIN ROUTES (NextAuth)
 * ======================================================
 */
router.post("/", requireAuth, requireAdmin, createProduct);
router.put("/:id", requireAuth, requireAdmin, updateProduct);
router.delete("/:id", requireAuth, requireAdmin, deleteProduct);
router.post("/bulk-delete", requireAuth, requireAdmin, bulkDeleteProducts);

export default router;