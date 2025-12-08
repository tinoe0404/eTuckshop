import { Hono } from "hono";
import {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,     
  changePassword,     
  forgotPassword,
  verifyResetTokenEndpoint,
  resetPassword,
} from "../controllers/auth.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

// Password reset routes (public - no authentication needed)
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-token", verifyResetTokenEndpoint);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateProfile);      // ADD THIS LINE
router.put("/password", protectRoute, changePassword);    // ADD THIS LINE

export default router;