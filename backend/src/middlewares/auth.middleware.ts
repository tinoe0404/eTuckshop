import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { prisma } from "../utils/prisma";

// Custom middleware to verify JWT and fetch user
export const protectRoute = async (c: Context, next: Next) => {
  try {
    let token: string | undefined;

    // 1. Try to get token from cookie first (primary method)
    token = getCookie(c, "accessToken");

    // 2. Fallback to Authorization header (for API clients that can't use cookies)
    if (!token) {
      const header = c.req.header("Authorization");
      if (header && header.startsWith("Bearer ")) {
        token = header.split(" ")[1];
      }
    }

    // 3. No token found
    if (!token) {
      return c.json({ 
        success: false, 
        message: "Unauthorized - No token provided" 
      }, 401);
    }

    // 4. Verify token using Hono's verify function
    const payload = await verify(token, process.env.ACCESS_TOKEN_SECRET!);

    if (!payload || !payload.userId) {
      return c.json({ 
        success: false, 
        message: "Unauthorized - Invalid token" 
      }, 401);
    }

    // 5. Fetch user from database
    const userId = Number(payload.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return c.json({ 
        success: false, 
        message: "User not found" 
      }, 401);
    }

    // 6. Attach user to context for downstream handlers
    c.set("user", user);
    await next();
  } catch (error: any) {
    console.error("Auth middleware error:", error);
    
    if (error.message?.includes("expired") || error.name === "JwtTokenExpired") {
      return c.json({ 
        success: false, 
        message: "Access token expired" 
      }, 401);
    }
    
    return c.json({ 
      success: false, 
      message: "Unauthorized - Invalid token",
      error: error.message 
    }, 401);
  }
};

// Admin role check middleware
export const adminRoute = async (c: Context, next: Next) => {
  const user = c.get("user");
  if (!user || user.role !== "ADMIN") {
    return c.json({ 
      success: false, 
      message: "Access denied - Admin only" 
    }, 403);
  }
  await next();
};