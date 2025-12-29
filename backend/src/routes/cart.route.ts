// src/routes/cart.route.ts
import { Hono } from "hono";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummaryGet, // Standardizing on the GET version
} from "../controllers/cart.controller";

import { requireAuth } from "../middlewares/auth.middleware";

const router = new Hono();

/**
 * ======================================================
 * CART ROUTES (Requires Auth for all)
 * ======================================================
 */

// Apply auth middleware to all routes in this router
router.use("/*", requireAuth);

// GET /api/cart -> Fetches full cart
router.get("/", getCart); 

// GET /api/cart/summary -> Lightweight totals for badge
router.get("/summary", getCartSummaryGet);

// POST /api/cart/add -> Add item
router.post("/add", addToCart);

// PATCH /api/cart/update -> Change quantity
router.patch("/update", updateCartItem);

// DELETE /api/cart/remove/:productId -> Remove item
router.delete("/remove/:productId", removeFromCart);

// POST /api/cart/clear -> Wipe cart
router.post("/clear", clearCart);

export default router;