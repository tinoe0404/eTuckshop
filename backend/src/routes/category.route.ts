import { Hono } from "hono";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
} from "../controllers/category.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// Public routes - anyone can view categories
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Admin-only routes - must be authenticated AND be an admin
router.post("/", protectRoute, adminRoute, createCategory);
router.put("/:id", protectRoute, adminRoute, updateCategory);
router.delete("/:id", protectRoute, adminRoute, deleteCategory);
router.get("/admin/stats", protectRoute, adminRoute, getCategoryStats);

export default router;