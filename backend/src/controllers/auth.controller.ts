import { Context } from "hono";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/db";
import { redis } from "../utils/redis";
import { generateTokens } from "../utils/tokens";
import jwt from "jsonwebtoken";

const setCookies = (c: Context, accessToken: string, refreshToken: string) => {
  c.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "Strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000,
  });

  c.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "Strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};


// SIGNUP
export const signup = async (c: Context) => {
    const { name, email, password, role } = await c.req.json();
  
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return c.json({ message: "User already exists" }, 400);
  
    const hashed = await bcrypt.hash(password, 10);
  
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
    });
  
    const { accessToken, refreshToken } = generateTokens(user.id);
    await redis.set(`refresh:${user.id}`, refreshToken, { ex: 7 * 24 * 60 * 60 });
  
    setCookies(c, accessToken, refreshToken);
  
    return c.json({
      user,
      redirectTo: user.role === "ADMIN" ? "/admin" : "/customer",
    });
  };
  
