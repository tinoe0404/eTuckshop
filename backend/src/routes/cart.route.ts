import { Hono } from "hono";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  getCartSummaryGet, // NEW function
} from "../controllers/cart.controller";

const router = new Hono();

// GET endpoint for cart summary (with userId in query param)
router.get("/summary", getCartSummaryGet);

// POST endpoints for cart operations
router.post("/", getCart);
router.post("/summary", getCartSummary);
router.post("/add", addToCart);
router.patch("/update", updateCartItem);
router.delete("/remove/:productId", removeFromCart);
router.post("/clear", clearCart);

export default router;