import { Hono } from "hono";
import {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
  forgotPassword,
  verifyResetTokenEndpoint,
  resetPassword,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = new Hono();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

// Password reset routes (public)
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-token", verifyResetTokenEndpoint);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/profile", authMiddleware, getProfile);

export default router;