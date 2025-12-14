// src/routes/cart.route.ts - FIXED

import { Hono } from "hono";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  getCartSummaryGet,
} from "../controllers/cart.controller";

const router = new Hono();

// ✅ ALL auth middleware REMOVED - cart operations are public
// Frontend NextAuth validates the user, then sends userId in requests

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