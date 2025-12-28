// File: src/controllers/auth.controller.ts
// FIXED: Protected routes now use c.get('user') from middleware

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
    
    if (!name || !email || !password) {
      console.log("❌ Validation failed: Missing fields");
      return c.json({ 
        success: false, 
        message: "All fields are required" 
      }, 400);
    }
    
    console.log("✅ Validation passed");
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
    console.log("🔐 Hashing password...");
    
    const hashed = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });
    
    console.log("✅ Password hashed");
    
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
// Location: Your backend controller
export const verifyCredentials = async (c: Context) => {
  try {
    const body = await c.req.json();
    // 1. Destructure the role sent from the frontend
    const { email, password, role: requestedRole } = body; 

    if (!email || !password || !requestedRole) {
      return c.json({ 
        success: false, 
        message: "Email, password, and role are required" 
      }, 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // 2. Validate user existence and password
    if (!user || !user.password) {
      return c.json({ success: false, message: "Invalid credentials" }, 401);
    }

    const isValid = await Bun.password.verify(password, user.password);
    if (!isValid) {
      return c.json({ success: false, message: "Invalid credentials" }, 401);
    }

    // 3. STRICT ROLE CHECK
    // This ensures an Admin email can only login if "ADMIN" role was chosen
    if (user.role !== requestedRole) {
      return c.json({ 
        success: false, 
        message: `This account is not registered as a ${requestedRole.toLowerCase()}.` 
      }, 403);
    }

    const { password: _, ...safeUser } = user;
    return c.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('💥 Verify credentials error:', error);
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

// ============================================
// NEXTAUTH PROTECTED ENDPOINTS
// These use requireAuth middleware and get user from context
// ============================================

/**
 * ✅ FIXED: Get user profile
 * Uses requireAuth middleware - user comes from c.get('user')
 */
export const getProfileById = async (c: Context) => {
  try {
    // ✅ Get user from context (set by requireAuth middleware)
    const user = c.get('user');
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    console.log(`👤 User ${user.email} (ID: ${user.id}) fetching their profile`);

    // Fetch fresh user data from database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
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

    if (!userData) {
      return c.json({ 
        success: false, 
        message: "User not found" 
      }, 404);
    }

    console.log(`✅ Profile retrieved for ${user.email}`);

    return c.json({ 
      success: true, 
      data: userData 
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    return serverError(c, error);
  }
};

/**
 * ✅ FIXED: Update user profile
 * Uses requireAuth middleware - user comes from c.get('user')
 */
export const updateUserProfile = async (c: Context) => {
  try {
    // ✅ Get user from context (set by requireAuth middleware)
    const user = c.get('user');
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    console.log(`✏️ User ${user.email} (ID: ${user.id}) updating profile`);

    const { name, email, image } = await c.req.json();

    if (!name || !email) {
      return c.json({ 
        success: false, 
        message: "Name and email are required" 
      }, 400);
    }

    // Check if email is being changed and if it's already taken
    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== user.id) {
        return c.json({ 
          success: false, 
          message: "Email already in use" 
        }, 400);
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        name, 
        email, 
        ...(image !== undefined && { image }) 
      },
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

    console.log(`✅ Profile updated for ${user.email}`);

    return c.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    return serverError(c, error);
  }
};

/**
 * ✅ FIXED: Change password
 * Uses requireAuth middleware - user comes from c.get('user')
 */
export const changePassword = async (c: Context) => {
  try {
    // ✅ Get user from context (set by requireAuth middleware)
    const user = c.get('user');
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: "Authentication required" 
      }, 401);
    }

    console.log(`🔐 User ${user.email} (ID: ${user.id}) changing password`);

    const { currentPassword, newPassword } = await c.req.json();

    // Validation
    if (!currentPassword || !newPassword) {
      return c.json({ 
        success: false, 
        message: "Current password and new password are required" 
      }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ 
        success: false, 
        message: "New password must be at least 6 characters" 
      }, 400);
    }

    // Get user with password from database
    const dbUser = await prisma.user.findUnique({ 
      where: { id: user.id } 
    });

    if (!dbUser || !dbUser.password) {
      return c.json({ 
        success: false, 
        message: "User not found" 
      }, 404);
    }

    // Verify current password
    const isValid = await Bun.password.verify(currentPassword, dbUser.password);
    if (!isValid) {
      console.log(`❌ Invalid current password for ${user.email}`);
      return c.json({ 
        success: false, 
        message: "Current password is incorrect" 
      }, 401);
    }

    // Check if new password is same as current
    const isSamePassword = await Bun.password.verify(newPassword, dbUser.password);
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
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log(`✅ Password changed successfully for ${user.email}`);

    // Optional: Invalidate all existing JWT sessions
    // await redis.del(`refresh_token:${user.id}`);

    return c.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error('❌ Error changing password:', error);
    return serverError(c, error);
  }
};

// ============================================
// PASSWORD RESET ENDPOINTS (Public - No Auth)
// ============================================

/**
 * Forgot Password (Send Reset Email)
 * Public endpoint - no auth required
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
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

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
 * Public endpoint - no auth required
 */
export const resetPassword = async (c: Context) => {
  try {
    const { token, newPassword } = await c.req.json();

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

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return c.json({ 
        success: false, 
        message: "Invalid or expired reset token" 
      }, 400);
    }

    const hashedPassword = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

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

// ============================================
// LEGACY JWT ENDPOINTS (Keep for compatibility)
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
      data: { user: safeUser },
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