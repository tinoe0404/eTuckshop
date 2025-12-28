// src/routes/category.route.ts
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

// Public
router.get("/", getAllCategories);

// Admin Stats (must be before :id)
router.get("/admin/stats", requireAuth, requireAdmin, getCategoryStats);

// Public Dynamic
router.get("/:id", getCategoryById);

// Admin CRUD
router.post("/", requireAuth, requireAdmin, createCategory);
router.put("/:id", requireAuth, requireAdmin, updateCategory);
router.delete("/:id", requireAuth, requireAdmin, deleteCategory);

export default router;