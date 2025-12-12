// File: src/routes/auth.route.ts

import { Hono } from "hono";
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  getUserByEmail,
  getUserById,
  verifyCredentials,
} from "../controllers/auth.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// ========== NextAuth-Compatible Endpoints ==========
router.post("/register", register);           // For NextAuth Credentials signup
router.post("/login", login);                 // For NextAuth Credentials login
router.post("/verify-credentials", verifyCredentials); // For NextAuth authorize()
router.post("/user/email", getUserByEmail);   // For NextAuth getUserByEmail
router.get("/user/:id", getUserById);         // For NextAuth getUserById

// ========== Standard Auth Endpoints ==========
router.post("/logout", logout);
router.post("/refresh", refreshToken);

// ========== Protected Endpoints ==========
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateProfile);
router.put("/password", protectRoute, changePassword);

export default router;