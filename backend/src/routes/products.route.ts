import { Hono } from "hono";
import {
    getAllProducts,
    getProductById,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct
  } from "../controllers/product.controller";
  

const router = new Hono();

router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Category-based fetching
router.get("/category/:categoryId", getProductsByCategory);

// Admin routes
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
