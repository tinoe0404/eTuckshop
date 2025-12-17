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
    console.log("📝 Registration attempt started");
    const body = await c.req.json();
    console.log("📦 Request body:", { ...body, password: "[HIDDEN]" });
    const { name, email, password, role } = body;
    
    // Validation
    if (!name || !email || !password) {
      console.log("❌ Validation failed: Missing fields");
      return c.json({ 
        success: false, 
        message: "All fields are required" 
      }, 400);
    }
    
    console.log("✅ Validation passed");
    
    // Check if user exists
    console.log("🔍 Checking if user exists...");
    const exists = await prisma.user.findUnique({ where: { email } });
    
    if (exists) {
      console.log("❌ User already exists");
      return c.json({ 
        success: false, 
        message: "User already exists" 
      }, 400);
    }
    
    console.log("✅ User doesn't exist, proceeding with creation");
    
    // Hash password
    console.log("🔐 Hashing password...");
    const hashed = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });
    console.log("✅ Password hashed");
    
    // Create user
    const userRole = role === "ADMIN" ? "ADMIN" : "CUSTOMER";
    console.log("👤 Creating user with role:", userRole);
    
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
    
    console.log("✅ User created successfully:", user.id);
    
    return c.json({
      success: true,
      message: "User registered successfully",
      data: { user },
    }, 201);
  } catch (error) {
    // Type assertion for better error handling
    console.error("💥 REGISTRATION ERROR:");
    
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error:", error);
    }
    
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

export const changePassword = async (c: Context) => {
  try {
    const { userId, currentPassword, newPassword } = await c.req.json();

    // Validation
    if (!userId || !currentPassword || !newPassword) {
      return c.json({ 
        success: false, 
        message: "All fields are required" 
      }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ 
        success: false, 
        message: "New password must be at least 6 characters" 
      }, 400);
    }

    // Get user with password
    const user = await prisma.user.findUnique({ 
      where: { id: parseInt(userId) } 
    });

    if (!user || !user.password) {
      return c.json({ 
        success: false, 
        message: "User not found" 
      }, 404);
    }

    // Verify current password
    const isValid = await Bun.password.verify(currentPassword, user.password);
    if (!isValid) {
      return c.json({ 
        success: false, 
        message: "Current password is incorrect" 
      }, 401);
    }

    // Check if new password is same as current
    const isSamePassword = await Bun.password.verify(newPassword, user.password);
    if (isSamePassword) {
      return c.json({ 
        success: false, 
        message: "New password must be different from current password" 
      }, 400);
    }

    // Hash new password
    const hashedPassword = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Update password
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword },
    });

    // Optional: Invalidate all existing JWT sessions
    // await redis.del(`refresh_token:${userId}`);

    return c.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return serverError(c, error);
  }
};


/**
 * Forgot Password (Send Reset Email)
 * Used when user doesn't know their password
 * Generates a reset token and sends email
 */
export const forgotPassword = async (c: Context) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ 
        success: false, 
        message: "Email is required" 
      }, 400);
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return c.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent",
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // TODO: Send email with reset link
    // Example using Resend:
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await resend.emails.send({
    //   from: 'noreply@yourdomain.com',
    //   to: user.email,
    //   subject: 'Password Reset Request',
    //   html: `Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.`,
    // });

    // For development, log the token
    console.log(`🔑 Password reset token for ${email}: ${resetToken}`);
    console.log(`🔗 Reset URL: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);

    return c.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent",
    });
  } catch (error) {
    return serverError(c, error);
  }
};

/**
 * Reset Password (Using Token from Email)
 * Used to actually reset the password with the token
 */
export const resetPassword = async (c: Context) => {
  try {
    const { token, newPassword } = await c.req.json();

    // Validation
    if (!token || !newPassword) {
      return c.json({ 
        success: false, 
        message: "Token and new password are required" 
      }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ 
        success: false, 
        message: "Password must be at least 6 characters" 
      }, 400);
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token not expired
        },
      },
    });

    if (!user) {
      return c.json({ 
        success: false, 
        message: "Invalid or expired reset token" 
      }, 400);
    }

    // Hash new password
    const hashedPassword = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return c.json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    return serverError(c, error);
  }
};
