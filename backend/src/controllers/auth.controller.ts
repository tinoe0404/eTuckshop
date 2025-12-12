// File: src/controllers/auth.controller.ts

import { Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { prisma } from "../utils/db";
import { redis } from "../utils/redis";
import { generateTokens, verifyRefreshToken } from "../utils/tokens";
import { serverError } from "../utils/serverError";

// ============================================
// REGISTER (for NextAuth Credentials Provider)
// ============================================
export const register = async (c: Context) => {
  try {
    const { name, email, password } = await c.req.json();

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

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return c.json({ 
        success: false, 
        message: "User already exists" 
      }, 400);
    }

    const hashed = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: "CUSTOMER" },
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
      user,
    }, 201);
  } catch (error) {
    return serverError(c, error);
  }
};

// ============================================
// VERIFY CREDENTIALS (NextAuth authorize callback)
// ============================================
export const verifyCredentials = async (c: Context) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ 
        success: false, 
        message: "Email and password are required" 
      }, 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return c.json({ 
        success: false, 
        message: "Invalid credentials" 
      }, 401);
    }

    const isValid = await Bun.password.verify(password, user.password);
    if (!isValid) {
      return c.json({ 
        success: false, 
        message: "Invalid credentials" 
      }, 401);
    }

    const { password: _, ...safeUser } = user;

    return c.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ============================================
// GET USER BY EMAIL (NextAuth needs this)
// ============================================
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

// ============================================
// GET USER BY ID (NextAuth needs this)
// ============================================
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
      user,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ============================================
// UPDATE USER (for NextAuth session updates)
// ============================================
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
      user: updated,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ============================================
// GET PROFILE (Protected route)
// ============================================
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
      user,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ============================================
// LEGACY: Login/Logout/Refresh (for backward compatibility)
// Keep these if you have mobile apps or direct API access
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
      user: safeUser,
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    return serverError(c, error);
  }
};

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