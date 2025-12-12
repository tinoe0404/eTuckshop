// File: src/routes/auth.route.ts (UPDATED FOR NEXTAUTH)

import { Hono } from "hono";
import {
  register,
  verifyCredentials,
  getUserByEmail,
  getUserById,
  updateUser,
  getProfile,
} from "../controllers/auth.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// ========== NextAuth Specific Endpoints ==========
// These are called by NextAuth during authentication
router.post("/register", register);
router.post("/verify-credentials", verifyCredentials);
router.post("/user/email", getUserByEmail);
router.get("/user/:id", getUserById);

// ========== Protected Endpoints ==========
// These require NextAuth session
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateUser);

// ========== NOTE ==========
// Remove legacy login/logout/refresh endpoints if you're doing full migration
// Or keep them for backward compatibility with mobile apps

export default router;