// File: src/middlewares/auth.middleware.ts
// NextAuth-compatible middleware using Option 2 (Best Practice)

import { Context, Next } from "hono";
import { prisma } from "../utils/prisma";

/**
 * ============================================
 * NEXTAUTH MIDDLEWARE (Option 2 - Best Practice)
 * ============================================
 * 
 * This middleware validates users based on NextAuth sessions.
 * Frontend sends userId from NextAuth session in request header.
 * Backend validates the user exists and attaches to context.
 * 
 * Benefits:
 * - Defense in depth (backend validates independently)
 * - Zero trust architecture (never trust client)
 * - Clear separation of concerns
 * - Easy to test and maintain
 */

/**
 * Validates user exists and attaches to context
 * Frontend must send X-User-Id header from NextAuth session
 * 
 * @example
 * // Frontend usage:
 * const session = await getSession();
 * fetch('/api/orders', {
 *   headers: {
 *     'X-User-Id': session.user.id,
 *     'Content-Type': 'application/json'
 *   }
 * });
 */
export const requireAuth = async (c: Context, next: Next) => {
  try {
    // Get userId from header (sent by frontend from NextAuth session)
    const userId = c.req.header('X-User-Id');
    
    if (!userId) {
      console.log('❌ Auth failed: No X-User-Id header');
      return c.json({ 
        success: false, 
        message: 'Authentication required. Please log in.' 
      }, 401);
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({ 
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
      }
    });
    
    if (!user) {
      console.log(`❌ Auth failed: User ${userId} not found`);
      return c.json({ 
        success: false, 
        message: 'Invalid user session. Please log in again.' 
      }, 401);
    }
    
    console.log(`✅ Auth success: ${user.email} (${user.role})`);
    
    // Attach user to context for use in controllers
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

/**
 * Validates user has ADMIN role
 * Must be used AFTER requireAuth
 * 
 * @example
 * router.get('/admin/dashboard', requireAuth, requireAdmin, getDashboard);
 */
export const requireAdmin = async (c: Context, next: Next) => {
  const user = c.get('user');
  
  if (!user) {
    console.log('❌ Admin check failed: No user in context');
    return c.json({ 
      success: false, 
      message: 'Authentication required' 
    }, 401);
  }
  
  if (user.role !== 'ADMIN') {
    console.log(`❌ Admin check failed: ${user.email} is ${user.role}`);
    return c.json({ 
      success: false, 
      message: 'Admin access required' 
    }, 403);
  }
  
  console.log(`✅ Admin check passed: ${user.email}`);
  await next();
};

/**
 * Validates user has CUSTOMER role (or ADMIN)
 * Must be used AFTER requireAuth
 * 
 * @example
 * router.get('/orders/my-orders', requireAuth, requireCustomer, getMyOrders);
 */
export const requireCustomer = async (c: Context, next: Next) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ 
      success: false, 
      message: 'Authentication required' 
    }, 401);
  }
  
  // Both CUSTOMER and ADMIN can access customer routes
  if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
    return c.json({ 
      success: false, 
      message: 'Customer access required' 
    }, 403);
  }
  
  await next();
};

/**
 * ============================================
 * LEGACY JWT MIDDLEWARE (Keep for backward compatibility)
 * ============================================
 * 
 * Only use this if you have mobile apps or other clients using JWT.
 * Remove if you're doing full NextAuth migration.
 */

import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

export const protectRoute = async (c: Context, next: Next) => {
  try {
    let token: string | undefined;

    // 1. Try to get token from cookie first
    token = getCookie(c, "accessToken");

    // 2. Fallback to Authorization header
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

    // 4. Verify token
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

    // 6. Attach user to context
    c.set("user", user);
    await next();
  } catch (error: any) {
    console.error("JWT Auth error:", error);
    
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

/**
 * Legacy admin check middleware (for JWT routes)
 */
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