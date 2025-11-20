import { Hono } from "hono";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
} from "../controllers/cart.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// All cart routes require authentication
router.use("*", protectRoute);

// Cart operations
router.get("/", getCart);
router.get("/summary", getCartSummary);
router.post("/add", addToCart);
router.patch("/update", updateCartItem);
router.delete("/remove/:productId", removeFromCart);
router.delete("/clear", clearCart);

export default router;