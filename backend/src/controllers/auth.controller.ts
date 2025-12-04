import { Context } from "hono";
import { prisma } from "../utils/db";
import { redis } from "../utils/redis";
import { generateTokens, verifyRefreshToken } from "../utils/tokens";
import { serverError } from "../utils/serverError";
import { sendPasswordResetEmail } from "../utils/email";
import { sign, verify } from "hono/jwt";

// ------------------- HELPER -------------------
const storeRefreshToken = async (userId: string, refreshToken: string) => {
  await redis.set(`refresh_token:${userId}`, refreshToken, {
    ex: 7 * 24 * 60 * 60,
  });
};

// Generate password reset token (valid for 1 hour)
const generateResetToken = async (userId: number, email: string) => {
  const secret = process.env.JWT_SECRET || "your-secret-key";
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
    const secret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = await verify(token, secret);
    
    if (decoded.type !== "password_reset") {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
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

    const { password: _, ...safeUser } = user;

    return c.json(
      {
        success: true,
        message: "User created successfully",
        user: safeUser,
        accessToken,
        refreshToken,
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

    const { password: _, ...safeUser } = user;

    console.log("✅ Login successful for:", user.email, "| Role:", user.role);

    return c.json({
      success: true,
      message: "Logged in successfully",
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return serverError(c, error);
  }
};

// ------------------- LOGOUT -------------------
export const logout = async (c: Context) => {
  try {
    const { refreshToken } = await c.req.json();

    if (refreshToken) {
      const decoded = await verifyRefreshToken(refreshToken);
      
      if (decoded && decoded.userId) {
        await redis.del(`refresh_token:${decoded.userId}`);
      }
    }

    return c.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return serverError(c, error);
  }
};

// ------------------- REFRESH ACCESS TOKEN -------------------
export const refreshToken = async (c: Context) => {
  try {
    const { refreshToken } = await c.req.json();
    if (!refreshToken)
      return c.json({ success: false, message: "No refresh token provided" }, 401);

    const decoded = await verifyRefreshToken(refreshToken);
    
    if (!decoded || !decoded.userId) {
      return c.json({ success: false, message: "Invalid refresh token" }, 401);
    }

    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
    if (storedToken !== refreshToken)
      return c.json({ success: false, message: "Invalid refresh token" }, 401);

    const { accessToken } = await generateTokens(decoded.userId as string);

    return c.json({
      success: true,
      message: "Token refreshed successfully",
      accessToken,
    });
  } catch (error) {
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
      user,
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

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return c.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly.",
      });
    }

    // Generate reset token
    const resetToken = await generateResetToken(user.id, user.email);

    // Store token in Redis with 1 hour expiration
    await redis.set(`password_reset:${user.id}`, resetToken, {
      ex: 60 * 60, // 1 hour
    });

    // Create reset link
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    // Send email
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    console.log("📧 Password reset email sent to:", user.email);

    return c.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link shortly.",
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

    // Check if token exists in Redis
    const storedToken = await redis.get(`password_reset:${decoded.userId}`);
    if (storedToken !== token) {
      return c.json({ success: false, message: "Invalid or expired token" }, 400);
    }

    return c.json({
      success: true,
      message: "Token is valid",
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

    // Verify token
    const decoded = await verifyResetToken(token);

    if (!decoded || !decoded.userId) {
      return c.json({ success: false, message: "Invalid or expired token" }, 400);
    }

    // Check if token exists in Redis
    const storedToken = await redis.get(`password_reset:${decoded.userId}`);
    if (storedToken !== token) {
      return c.json({ success: false, message: "Invalid or expired token" }, 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId as number },
    });

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
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

    // Delete reset token from Redis
    await redis.del(`password_reset:${user.id}`);

    // Clear all refresh tokens (force re-login on all devices)
    await redis.del(`refresh_token:${user.id}`);

    console.log("✅ Password reset successful for:", user.email);

    return c.json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return serverError(c, error);
  }
};