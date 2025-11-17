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


