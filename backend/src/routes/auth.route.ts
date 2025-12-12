// File: src/routes/auth.route.ts

import { Hono } from "hono";
import {
  register,
  verifyCredentials,
  getUserByEmail,
  getUserById,
  updateUser,
  getProfile,
  login,
  logout,
  refreshToken,
} from "../controllers/auth.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// ========== NextAuth Endpoints ==========
router.post("/register", register);
router.post("/verify-credentials", verifyCredentials);
router.post("/user/email", getUserByEmail);
router.get("/user/:id", getUserById);

// ========== Protected Endpoints ==========
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateUser);

// ========== Legacy Endpoints (Optional - for direct API/mobile) ==========
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

export default router;