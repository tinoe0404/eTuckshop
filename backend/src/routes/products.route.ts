import { Hono } from "hono";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
} from "../controllers/product.controller";

const productRoutes = new Hono();

// Public routes
productRoutes.get("/", getAllProducts);
productRoutes.get("/:id", getProductById);
productRoutes.get("/category/:categoryId", getProductsByCategory);

// Admin routes
productRoutes.post("/", createProduct);
productRoutes.put("/:id", updateProduct);
productRoutes.delete("/:id", deleteProduct);

export default productRoutes;
