import { Hono } from "hono";
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";

const productRoutes = new Hono();

productRoutes.get("/", getAllProducts);
productRoutes.get("/:id", getProductById);

// Category-based fetching
productRoutes.get("/category/:categoryId", getProductsByCategory);

// Admin routes
productRoutes.post("/", createProduct);
productRoutes.put("/:id", updateProduct);
productRoutes.delete("/:id", deleteProduct);

export default productRoutes;
