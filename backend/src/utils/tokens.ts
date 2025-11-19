import { sign, verify } from "hono/jwt";

export const generateTokens = async (userId: string) => {
  const accessToken = await sign(
    { 
      userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15 minutes
    },
    process.env.ACCESS_TOKEN_SECRET!
  );

  const refreshToken = await sign(
    { 
      userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    },
    process.env.REFRESH_TOKEN_SECRET!
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = async (token: string) => {
  try {
    return await verify(token, process.env.ACCESS_TOKEN_SECRET!);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = async (token: string) => {
  try {
    return await verify(token, process.env.REFRESH_TOKEN_SECRET!);
  } catch (error) {
    return null;
  }
};
