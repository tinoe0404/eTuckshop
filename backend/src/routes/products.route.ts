// src/routes/products.route.ts
import { Hono } from "hono";
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// Public routes - anyone can view products
router.get("/", getAllProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/:id", getProductById);

// Admin-only routes - must be authenticated AND be an admin
router.post("/", protectRoute, adminRoute, createProduct);
router.put("/:id", protectRoute, adminRoute, updateProduct);
router.delete("/:id", protectRoute, adminRoute, deleteProduct);

export default router;