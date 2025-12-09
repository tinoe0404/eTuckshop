import { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { prisma } from "../utils/db";
import { redis } from "../utils/redis";
import { generateTokens, verifyRefreshToken } from "../utils/tokens";
import { serverError } from "../utils/serverError";
import { sendPasswordResetEmail } from "../utils/email";
import { sign, verify } from "hono/jwt";

// ------------------- HELPER -------------------
const storeRefreshToken = async (userId: string, refreshToken: string) => {
  await redis.set(`refresh_token:${userId}`, refreshToken, {
    ex: 7 * 24 * 60 * 60, // 7 days
  });
};

// Generate password reset token (valid for 1 hour)
const generateResetToken = async (userId: number, email: string) => {
  const secret = process.env.ACCESS_TOKEN_SECRET!;
  const token = await sign(
    {
      userId,
      email,
      type: "password_reset",
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    },
    secret
  );
  return token;
};

// Verify password reset token
const verifyResetToken = async (token: string) => {
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET!;
    const decoded = await verify(token, secret);
    
    if (decoded.type !== "password_reset") {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
};

// Helper to set auth cookies
// Helper to set auth cookies (UPDATED for deployment)
const setAuthCookies = (c: Context, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === "production";
  const domain = isProd ? process.env.COOKIE_DOMAIN : undefined; // e.g., ".yourdomain.com"
  
  // Access token cookie (15 minutes)
  setCookie(c, "accessToken", accessToken, {
    httpOnly: true,
    secure: isProd, // ✅ true in production (HTTPS only)
    sameSite: isProd ? "None" : "Lax", // ✅ "None" needed for cross-site in production
    domain, // ✅ Set domain for cross-subdomain sharing if needed
    path: "/",
    maxAge: 60 * 15, // 15 minutes
  });

  // Refresh token cookie (7 days)
  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    domain,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
};

// Helper to clear auth cookies
const clearAuthCookies = (c: Context) => {
  deleteCookie(c, "accessToken", { path: "/" });
  deleteCookie(c, "refreshToken", { path: "/" });
};

// ------------------- SIGNUP -------------------
export const signup = async (c: Context) => {
  try {
    const { name, email, password, role } = await c.req.json();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return c.json({ success: false, message: "User already exists" }, 400);

    const hashed = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
    });

    const { accessToken, refreshToken } = await generateTokens(user.id.toString());
    await storeRefreshToken(user.id.toString(), refreshToken);

    // Set httpOnly cookies
    setAuthCookies(c, accessToken, refreshToken);

    const { password: _, ...safeUser } = user;

    return c.json(
      {
        success: true,
        message: "User created successfully",
        data: {
          user: safeUser,
        }
      },
      201
    );
  } catch (error) {
    return serverError(c, error);
  }
};

// ------------------- LOGIN -------------------
export const login = async (c: Context) => {
  try {
    const { email, password } = await c.req.json();

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
      return c.json({ success: false, message: "Invalid email or password" }, 400);

    const valid = await Bun.password.verify(password, user.password);
    if (!valid)
      return c.json({ success: false, message: "Invalid email or password" }, 400);

    const { accessToken, refreshToken } = await generateTokens(user.id.toString());
    await storeRefreshToken(user.id.toString(), refreshToken);

    // Set httpOnly cookies
    setAuthCookies(c, accessToken, refreshToken);

    const { password: _, ...safeUser } = user;

    return c.json({
      success: true,
      message: "Logged in successfully",
      data: { user: safeUser }
    });

  } catch (error) {
    return serverError(c, error);
  }
};

// ------------------- LOGOUT -------------------
export const logout = async (c: Context) => {
  try {
    // Try to get refresh token from cookie first, then body
    const cookieRefreshToken = c.req.header("Cookie")?.match(/refreshToken=([^;]+)/)?.[1];
    const bodyData = await c.req.json().catch(() => ({}));
    const refreshToken = cookieRefreshToken || bodyData.refreshToken;

    if (refreshToken) {
      const decoded = await verifyRefreshToken(refreshToken);
      
      if (decoded && decoded.userId) {
        await redis.del(`refresh_token:${decoded.userId}`);
      }
    }

    // Clear cookies
    clearAuthCookies(c);

    return c.json({ 
      success: true, 
      message: "Logged out successfully",
      data: null 
    });
  } catch (error) {
    // Still clear cookies even if there's an error
    clearAuthCookies(c);
    return c.json({ 
      success: true, 
      message: "Logged out successfully",
      data: null 
    });
  }
};

// ------------------- REFRESH ACCESS TOKEN -------------------
export const refreshToken = async (c: Context) => {
  try {
    // Try to get refresh token from cookie first, then body
    const cookieRefreshToken = c.req.header("Cookie")?.match(/refreshToken=([^;]+)/)?.[1];
    const bodyData = await c.req.json().catch(() => ({}));
    const refreshToken = cookieRefreshToken || bodyData.refreshToken;

    if (!refreshToken)
      return c.json({ success: false, message: "No refresh token provided" }, 401);

    const decoded = await verifyRefreshToken(refreshToken);
    
    if (!decoded || !decoded.userId) {
      clearAuthCookies(c);
      return c.json({ success: false, message: "Invalid refresh token" }, 401);
    }

    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      clearAuthCookies(c);
      return c.json({ success: false, message: "Invalid refresh token" }, 401);
    }

    const { accessToken } = await generateTokens(decoded.userId as string);

    // Update only the access token cookie
    const isProd = process.env.NODE_ENV === "production";
    setCookie(c, "accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 15, // 15 minutes
    });

    return c.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken,
      }
    });
  } catch (error) {
    clearAuthCookies(c);
    return serverError(c, error);
  }
};

// ------------------- GET PROFILE -------------------
export const getProfile = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user)
      return c.json({ success: false, message: "Unauthorized" }, 401);

    return c.json({
      success: true,
      message: "Profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ------------------- UPDATE PROFILE -------------------
export const updateProfile = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const { name, email } = await c.req.json();

    // Validate input
    if (!name || !email) {
      return c.json({ 
        success: false, 
        message: "Name and email are required" 
      }, 400);
    }

    if (name.length < 2) {
      return c.json({ 
        success: false, 
        message: "Name must be at least 2 characters" 
      }, 400);
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({ 
        where: { email } 
      });
      
      if (existingUser && existingUser.id !== user.id) {
        return c.json({ 
          success: false, 
          message: "Email is already taken" 
        }, 400);
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name, email },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        createdAt: true,
        updatedAt: true
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

// ------------------- CHANGE PASSWORD -------------------
export const changePassword = async (c: Context) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const { currentPassword, newPassword } = await c.req.json();

    // Validate input
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

    // Get user with password
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Verify current password
    const isValid = await Bun.password.verify(currentPassword, fullUser.password);
    if (!isValid) {
      return c.json({ 
        success: false, 
        message: "Current password is incorrect" 
      }, 400);
    }

    // Check if new password is same as current
    const isSamePassword = await Bun.password.verify(newPassword, fullUser.password);
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

    // Invalidate all refresh tokens (force re-login on other devices)
    await redis.del(`refresh_token:${user.id}`);

    return c.json({
      success: true,
      message: "Password changed successfully",
      data: null,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ------------------- FORGOT PASSWORD -------------------
export const forgotPassword = async (c: Context) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ success: false, message: "Email is required" }, 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return c.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly.",
        data: null
      });
    }

    const resetToken = await generateResetToken(user.id, user.email);

    await redis.set(`password_reset:${user.id}`, resetToken, {
      ex: 60 * 60,
    });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    console.log("📧 Password reset email sent to:", user.email);

    return c.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link shortly.",
      data: null
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return serverError(c, error);
  }
};

// ------------------- VERIFY RESET TOKEN -------------------
export const verifyResetTokenEndpoint = async (c: Context) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ success: false, message: "Token is required" }, 400);
    }

    const decoded = await verifyResetToken(token);

    if (!decoded || !decoded.userId) {
      return c.json({ success: false, message: "Invalid or expired token" }, 400);
    }

    const storedToken = await redis.get(`password_reset:${decoded.userId}`);
    if (storedToken !== token) {
      return c.json({ success: false, message: "Invalid or expired token" }, 400);
    }

    return c.json({
      success: true,
      message: "Token is valid",
      data: null
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ------------------- RESET PASSWORD -------------------
export const resetPassword = async (c: Context) => {
  try {
    const { token, newPassword } = await c.req.json();

    if (!token || !newPassword) {
      return c.json({ success: false, message: "Token and new password are required" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ success: false, message: "Password must be at least 6 characters" }, 400);
    }

    const decoded = await verifyResetToken(token);

    if (!decoded || !decoded.userId) {
      return c.json({ success: false, message: "Invalid or expired token" }, 400);
    }

    const storedToken = await redis.get(`password_reset:${decoded.userId}`);
    if (storedToken !== token) {
      return c.json({ success: false, message: "Invalid or expired token" }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId as number },
    });

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    const hashedPassword = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await redis.del(`password_reset:${user.id}`);
    await redis.del(`refresh_token:${user.id}`);

    console.log("✅ Password reset successful for:", user.email);

    return c.json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
      data: null
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return serverError(c, error);
  }
};