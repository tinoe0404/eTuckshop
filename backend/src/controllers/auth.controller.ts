import { Context } from "hono";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/db";
import { redis } from "../utils/redis";
import { generateTokens } from "../utils/tokens";
import jwt from "jsonwebtoken";

// Save refresh token in Redis
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
    if (exists) return c.json({ message: "User already exists" }, 400);

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
    });

    const { accessToken, refreshToken } = generateTokens(user.id.toString());
    await storeRefreshToken(user.id.toString(), refreshToken);

    const { password: _, ...safeUser } = user;

    return c.json({
      user: safeUser,
      accessToken,
      refreshToken,
      message: "User created successfully",
    });
  } catch (error: any) {
    return c.json({ message: "Server error", error: error.message }, 500);
  }
};

// ------------------- LOGIN -------------------
export const login = async (c: Context) => {
  try {
    const { email, password } = await c.req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return c.json({ message: "Invalid email or password" }, 400);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return c.json({ message: "Invalid email or password" }, 400);

    const { accessToken, refreshToken } = generateTokens(user.id.toString());
    await storeRefreshToken(user.id.toString(), refreshToken);

    const { password: _, ...safeUser } = user;

    return c.json({
      user: safeUser,
      accessToken,
      refreshToken,
      message: "Logged in successfully",
    });
  } catch (error: any) {
    return c.json({ message: "Server error", error: error.message }, 500);
  }
};

export const logout = async (c: Context) => {
  try {
    const { refreshToken } = await c.req.json();

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET!
        ) as { userId: string };

        await redis.del(`refresh_token:${decoded.userId}`);
      } catch {
        // silently ignore invalid/expired token (best practice)
      }
    }

    return c.json({ message: "Logged out successfully" });
  } catch (error: any) {
    return c.json(
      {
        message: "Server error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      500
    );
  }
};

// ------------------- REFRESH ACCESS TOKEN -------------------
export const refreshToken = async (c: Context) => {
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken)
      return c.json({ message: "No refresh token provided" }, 401);

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as { userId: string };

    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
    if (storedToken !== refreshToken)
      return c.json({ message: "Invalid refresh token" }, 401);

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "15m" }
    );

    return c.json({ accessToken, message: "Token refreshed successfully" });
  } catch (error: any) {
    return c.json({ message: "Server error", error: error.message }, 500);
  }
};

// ------------------- GET PROFILE -------------------
export const getProfile = async (c: Context) => {
  try {
    return c.json(c.get("user"));
  } catch (error: any) {
    return c.json({ message: "Server error", error: error.message }, 500);
  }
};
