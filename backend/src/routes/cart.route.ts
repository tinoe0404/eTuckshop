// src/routes/cart.route.ts
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

import { requireAuth } from "../middlewares/auth.middleware";

const router = new Hono();

/**
 * ======================================================
 * CART ROUTES (NextAuth)
 * ======================================================
 */

router.get("/summary", requireAuth, getCartSummaryGet);
router.post("/", requireAuth, getCart);
router.post("/summary", requireAuth, getCartSummary);
router.post("/add", requireAuth, addToCart);
router.patch("/update", requireAuth, updateCartItem);
router.delete("/remove/:productId", requireAuth, removeFromCart);
router.post("/clear", requireAuth, clearCart);

export default router;