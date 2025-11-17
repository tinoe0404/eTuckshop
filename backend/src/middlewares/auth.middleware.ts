import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";

export const protectRoute = async (c: Context, next: Next) => {
  try {
    const token = c.req.cookie("accessToken");

    if (!token) {
      return c.json({ message: "Unauthorized - No access token provided" }, 401);
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return c.json({ message: "User not found" }, 401);
    }

    c.set("user", user);

    await next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return c.json({ message: "Unauthorized - Access token expired" }, 401);
    }

    return c.json({ message: "Unauthorized - Invalid access token" }, 401);
  }
};

export const adminRoute = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user || user.role !== "ADMIN") {
    return c.json({ message: "Access denied - Admin only" }, 403);
  }

  await next();
};
