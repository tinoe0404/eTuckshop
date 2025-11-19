import { Hono } from "hono";
import {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
} from "../controllers/auth.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);

// Protected routes
router.post("/logout", protectRoute, logout);
router.get("/profile", protectRoute, getProfile);

// Admin only route
router.get("/admin-only", protectRoute, adminRoute, (c) =>
  c.json({ success: true, message: "Admin route works" })
);

export default router;