// File: src/routes/cart.route.ts (UPDATED FOR NEXTAUTH)

import { Hono } from "hono";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
} from "../controllers/cart.controller";

const router = new Hono();

// All cart routes now accept userId in request body
// Frontend sends userId from NextAuth session
// No backend auth middleware required

router.post("/", getCart); // Changed from GET to POST to accept userId in body
router.post("/summary", getCartSummary); // Changed from GET to POST
router.post("/add", addToCart);
router.patch("/update", updateCartItem);
router.delete("/remove/:productId", removeFromCart); // Sends userId in body
router.post("/clear", clearCart); // Changed from DELETE to POST

export default router;