import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";

export const protectRoute = async (c: Context, next: Next) => {
  try {
    const header = c.req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
      return c.json({ message: "Unauthorized - No token provided" }, 401);
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) return c.json({ message: "User not found" }, 401);

    c.set("user", user);
    await next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return c.json({ message: "Access token expired" }, 401);
    }
    return c.json({ message: "Invalid token" }, 401);
  }
};

export const adminRoute = async (c: Context, next: Next) => {
  const user = c.get("user");
  if (!user || user.role !== "ADMIN") {
    return c.json({ message: "Access denied - Admin only" }, 403);
  }
  await next();
};
