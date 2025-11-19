import { Context } from "hono";
import { prisma } from "../utils/db";
import { redis } from "../utils/redis";
import { generateTokens, verifyRefreshToken } from "../utils/tokens";
import { serverError } from "../utils/serverError";

// ------------------- HELPER -------------------
const storeRefreshToken = async (userId: string, refreshToken: string) => {
  await redis.set(`refresh_token:${userId}`, refreshToken, {
    ex: 7 * 24 * 60 * 60,
  });
};

// ------------------- SIGNUP -------------------
export const signup = async (c: Context) => {
  try {
    const { name, email, password, role } = await c.req.json();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return c.json({ success: false, message: "User already exists" }, 400);

    // Use Bun's built-in password hashing (faster than bcrypt)
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

    // Use Bun's built-in password verification
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
