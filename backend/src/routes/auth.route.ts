// File: src/routes/auth.route.ts (UPDATED FOR NEXTAUTH)

import { Hono } from "hono";
import {
  register,
  verifyCredentials,
  getUserByEmail,
  getUserById,
  getProfileById,
  updateUserProfile,
  // Legacy JWT endpoints (optional - keep for backward compatibility)
  login,
  logout,
  refreshToken,
  getProfile,
  updateUser,
} from "../controllers/auth.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// ========== NextAuth Specific Endpoints (Public) ==========
// These are called BY NextAuth during authentication flow
router.post("/register", register);
router.post("/verify-credentials", verifyCredentials);
router.post("/user/email", getUserByEmail);
router.get("/user/:id", getUserById);

// ========== Frontend Protected Endpoints ==========
// These endpoints DON'T use JWT middleware
// Frontend validates session via NextAuth, sends userId in request body
router.post("/profile/by-id", getProfileById);
router.put("/profile/update", updateUserProfile);

// ========== Legacy JWT Endpoints (Optional) ==========
// Keep these ONLY if you have mobile apps or other clients using JWT
// Remove if you're doing full NextAuth migration
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateUser);
router.put("/profile/update", updateUserProfile);

export default router;