// File: src/routes/auth.route.ts
// Updated to use new NextAuth-compatible middleware

import { Hono } from "hono";
import {
  register,
  verifyCredentials,
  getUserByEmail,
  getUserById,
  getProfileById,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  // Legacy JWT endpoints (optional - for backward compatibility)
  login,
  logout,
  refreshToken,
  getProfile,
  updateUser,
} from "../controllers/auth.controller";
import { requireAuth, protectRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// Add this middleware at the top of your router definition
router.use('*', async (c, next) => {
  await next();
  // FORCE no caching for all auth endpoints
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
});

// ========== PUBLIC ENDPOINTS ==========
// No authentication required

// NextAuth Integration Endpoints
router.post("/register", register);
router.post("/verify-credentials", verifyCredentials);
router.post("/user/email", getUserByEmail);
router.get("/user/:id", getUserById);

// Password Reset Endpoints
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ========== NEXTAUTH PROTECTED ENDPOINTS ==========
// Uses requireAuth middleware (validates NextAuth session via X-User-Id header)

// Profile Management (NextAuth users)
router.get("/me", requireAuth, getProfile); // ✅ Added for frontend sync
router.post("/profile/by-id", requireAuth, getProfileById);
router.put("/profile/update", requireAuth, updateUserProfile);
router.put('/password', requireAuth, changePassword);

// ========== LEGACY JWT ENDPOINTS ==========
// Uses protectRoute middleware (validates JWT tokens)
// Keep these ONLY if you have mobile apps or other clients using JWT
// Remove if doing full NextAuth migration

router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateUser);

export default router;