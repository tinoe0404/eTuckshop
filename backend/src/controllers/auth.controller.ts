// File: src/controllers/auth.controller.ts (UPDATED - BEST PRACTICES)

import { Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { prisma } from "../utils/prisma";
import { redis } from "../utils/redis";
import { generateTokens, verifyRefreshToken } from "../utils/tokens";
import { serverError } from "../utils/serverError";

// ============================================
// NEXTAUTH ENDPOINTS (Public - No Auth Required)
// These are called BY NextAuth, not by authenticated users
// ============================================

/**
 * Register new user
 * Called directly by user registration form
 * No authentication required
 */
export const register = async (c: Context) => {
  try {
    const { name, email, password, role } = await c.req.json();

    // Validation
    if (!name || !email || !password) {
      return c.json({ 
        success: false, 
        message: "All fields are required" 
      }, 400);
    }

    if (password.length < 6) {
      return c.json({ 
        success: false, 
        message: "Password must be at least 6 characters" 
      }, 400);
    }

    // Check if user exists
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return c.json({ 
        success: false, 
        message: "User already exists" 
      }, 400);
    }

    // Hash password
    const hashed = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Create user with provided or default role
    const userRole = role === "ADMIN" ? "ADMIN" : "CUSTOMER";
    
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashed, 
        role: userRole 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      }
    });

    return c.json({
      success: true,
      message: "User registered successfully",
      data: { user },
    }, 201);
  } catch (error) {
    return serverError(c, error);
  }
};

/**
 * Verify user credentials
 * Called BY NextAuth during login (authorize callback)
 * No authentication required - this IS the authentication
 */
export const verifyCredentials = async (c: Context) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ 
        success: false, 
        message: "Email and password are required" 
      }, 400);
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return c.json({ 
        success: false, 
        message: "Invalid credentials" 
      }, 401);
    }

    // Verify password
    const isValid = await Bun.password.verify(password, user.password);
    if (!isValid) {
      return c.json({ 
        success: false, 
        message: "Invalid credentials" 
      }, 401);
    }

    // Return user without password
    const { password: _, ...safeUser } = user;

    return c.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

/**
 * Get user by email
 * Called BY NextAuth if needed
 * No authentication required
 */
export const getUserByEmail = async (c: Context) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ 
        success: false, 
        message: "Email is required" 
      }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      }
    });

    if (!user) {
      return c.json({ 
        success: false, 
        message: "User not found" 
      }, 404);
    }

    return c.json({
      success: true,
      user,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

/**
 * Get user by ID
 * Called BY NextAuth or frontend with userId from session
 * No authentication required - used for fetching public user data
 */
export const getUserById = async (c: Context) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ 
        success: false, 
        message: "User ID is required" 
      }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      }
    });

    if (!user) {
      return c.json({ 
        success: false, 
        message: "User not found" 
      }, 404);
    }

    return c.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

/**
 * Get user profile by ID (POST version)
 * Used by frontend to fetch user details using session userId
 * No backend auth required - frontend validates session via NextAuth
 */
export const getProfileById = async (c: Context) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ success: false, message: "User ID required" }, 400);
    }

    const user = await prisma.user.findUnique({
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

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    return c.json({ success: true, data: user });
  } catch (error) {
    return serverError(c, error);
  }
};

/**
 * Update user profile
 * Frontend sends userId from NextAuth session
 * No backend auth required - frontend validates session
 */
// File: src/controllers/auth.controller.ts

export const updateUserProfile = async (c: Context) => {
  try {
    const { userId, name, email, image } = await c.req.json();

    if (!userId || !name || !email) {
      return c.json({ success: false, message: "Required fields missing" }, 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== parseInt(userId)) {
      return c.json({ success: false, message: "Email already in use" }, 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { name, email, ...(image !== undefined && { image }) },
      select: {
        id: true, name: true, email: true, role: true,
        image: true, emailVerified: true, createdAt: true, updatedAt: true,
      },
    });

    return c.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return serverError(c, error);
  }
};


// ============================================
// LEGACY JWT ENDPOINTS (Protected with JWT Middleware)
// Keep these for backward compatibility with mobile apps
// Remove if you're ONLY using NextAuth
// ============================================

const setAuthCookies = (c: Context, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === "production";
  
  setCookie(c, "accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    path: "/",
    maxAge: 60 * 15,
  });

  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
};

const clearAuthCookies = (c: Context) => {
  const isProd = process.env.NODE_ENV === "production";
  deleteCookie(c, "accessToken", { path: "/", secure: isProd, sameSite: isProd ? "None" : "Lax" });
  deleteCookie(c, "refreshToken", { path: "/", secure: isProd, sameSite: isProd ? "None" : "Lax" });
};

/**
 * LEGACY: JWT-based login
 * Use this for mobile apps or direct API access
 */
export const login = async (c: Context) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ success: false, message: "Email and password required" }, 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return c.json({ success: false, message: "Invalid credentials" }, 401);
    }

    const isValid = await Bun.password.verify(password, user.password);
    if (!isValid) {
      return c.json({ success: false, message: "Invalid credentials" }, 401);
    }

    const { accessToken, refreshToken } = await generateTokens(user.id.toString());
    await redis.set(`refresh_token:${user.id}`, refreshToken, { ex: 7 * 24 * 60 * 60 });

    setAuthCookies(c, accessToken, refreshToken);

    const { password: _, ...safeUser } = user;

    return c.json({
      success: true,
      message: "Login successful",
      data: { user: safeUser },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

/**
 * LEGACY: JWT-based logout
 */
export const logout = async (c: Context) => {
  try {
    const refreshToken = getCookie(c, "refreshToken") || (await c.req.json().catch(() => ({}))).refreshToken;

    if (refreshToken) {
      const decoded = await verifyRefreshToken(refreshToken);
      if (decoded?.userId) {
        await redis.del(`refresh_token:${decoded.userId}`);
      }
    }

    clearAuthCookies(c);
    return c.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    clearAuthCookies(c);
    return c.json({ success: true, message: "Logged out successfully" });
  }
};

/**
 * LEGACY: JWT token refresh
 */
export const refreshToken = async (c: Context) => {
  try {
    const refreshToken = getCookie(c, "refreshToken") || (await c.req.json().catch(() => ({}))).refreshToken;

    if (!refreshToken) {
      return c.json({ success: false, message: "No refresh token" }, 401);
    }

    const decoded = await verifyRefreshToken(refreshToken);
    
    if (!decoded?.userId) {
      clearAuthCookies(c);
      return c.json({ success: false, message: "Invalid refresh token" }, 401);
    }

    const stored = await redis.get(`refresh_token:${decoded.userId}`);
    if (stored !== refreshToken) {
      clearAuthCookies(c);
      return c.json({ success: false, message: "Invalid refresh token" }, 401);
    }

    const { accessToken } = await generateTokens(decoded.userId as string);

    const isProd = process.env.NODE_ENV === "production";
    setCookie(c, "accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      path: "/",
      maxAge: 60 * 15,
    });

    return c.json({
      success: true,
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    clearAuthCookies(c);
    return serverError(c, error);
  }
};

/**
 * LEGACY: Get profile (JWT protected)
 * This is the OLD way - requires JWT middleware
 */
export const getProfile = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Unauthorized" 
      }, 401);
    }

    return c.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

/**
 * LEGACY: Update user (JWT protected)
 * This is the OLD way - requires JWT middleware
 */
export const updateUser = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Unauthorized" 
      }, 401);
    }

    const { name, email, image } = await c.req.json();

    if (!name || !email) {
      return c.json({ 
        success: false, 
        message: "Name and email are required" 
      }, 400);
    }

    if (email !== user.email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists && exists.id !== user.id) {
        return c.json({ 
          success: false, 
          message: "Email already taken" 
        }, 400);
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name, email, ...(image && { image }) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return c.json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    return serverError(c, error);
  }
};