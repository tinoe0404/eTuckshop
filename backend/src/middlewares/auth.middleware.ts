import { Context, Next } from "hono";
import { getCookie } from "hono/cookie"; // ✅ Restored for protectRoute
import { verify } from "hono/jwt";       // ✅ Restored for protectRoute
import { prisma } from "../utils/prisma";
import { getOrSetCache } from "../utils/cache";
import { redis } from "../utils/redis"; // Needed if you use raw redis calls in legacy
import * as crypto from "node:crypto";

/**
 * ============================================
 * NEXTAUTH MIDDLEWARE (Redis Optimized)
 * ============================================
 */

export const requireAuth = async (c: Context, next: Next) => {
  try {
    let userId = c.req.header('X-User-Id');
    let signature = c.req.header('X-User-Signature');

    // 🚀 Fallback for SSE (EventSource cannot set headers)
    if (!userId) {
      userId = c.req.query('userId');
      signature = c.req.query('signature');
    }

    if (!userId) {
      return c.json({
        success: false,
        message: 'Authentication required. Please log in.'
      }, 401);
    }

    // 🔐 HMAC Security Verification
    const secret = process.env.QR_SIGNING_SECRET;
    if (secret) {
      if (!signature) {
        console.warn(`⚠️ Blocked request for User ${userId}: Missing Signature`);
        return c.json({ success: false, message: 'Missing security signature' }, 401);
      }

      const expected = crypto.createHmac('sha256', secret).update(userId).digest('hex');

      // Secure comparison
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        console.error(`🚨 Security Alert: Invalid Signature for User ${userId}`);
        return c.json({ success: false, message: 'Invalid security signature' }, 401);
      }
    }

    const cacheKey = `session_user:${userId}`;

    // ⚡ Redis Cache Check
    const user = await getOrSetCache(cacheKey, async () => {
      return await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    }, 60);

    if (!user) {
      return c.json({
        success: false,
        message: 'Invalid user session. Please log in again.'
      }, 401);
    }

    c.set('user', user);
    await next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return c.json({
      success: false,
      message: 'Authentication failed'
    }, 401);
  }
};

export const requireAdmin = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, message: 'Authentication required' }, 401);
  if (user.role !== 'ADMIN') return c.json({ success: false, message: 'Admin access required' }, 403);
  await next();
};

export const requireCustomer = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, message: 'Authentication required' }, 401);
  if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Customer access required' }, 403);
  }
  await next();
};

/**
 * ============================================
 * LEGACY JWT MIDDLEWARE (Restored)
 * ============================================
 */

export const protectRoute = async (c: Context, next: Next) => {
  try {
    let token: string | undefined;

    token = getCookie(c, "accessToken");

    if (!token) {
      const header = c.req.header("Authorization");
      if (header && header.startsWith("Bearer ")) {
        token = header.split(" ")[1];
      }
    }

    if (!token) {
      return c.json({ success: false, message: "Unauthorized - No token provided" }, 401);
    }

    // Verify JWT
    const payload = await verify(token, process.env.ACCESS_TOKEN_SECRET!);

    if (!payload || !payload.userId) {
      return c.json({ success: false, message: "Unauthorized - Invalid token" }, 401);
    }

    const userId = Number(payload.userId);

    // Fetch user for JWT context (We can use our new cache util here too!)
    const cacheKey = `jwt_user:${userId}`;
    const user = await getOrSetCache(cacheKey, async () => {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true },
      });
    }, 60);

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 401);
    }

    c.set("user", user);
    await next();
  } catch (error: any) {
    if (error.message?.includes("expired") || error.name === "JwtTokenExpired") {
      return c.json({ success: false, message: "Access token expired" }, 401);
    }
    return c.json({ success: false, message: "Unauthorized", error: error.message }, 401);
  }
};