import { Hono } from "hono";
import { signup, login, logout, refreshToken } from "../controllers/auth.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

export const router = new Hono();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", protectRoute, logout);
router.post("/refresh", refreshToken);

router.get("/admin-only", protectRoute, adminRoute, (c) =>
  c.json({ message: "Admin route works" })
);
