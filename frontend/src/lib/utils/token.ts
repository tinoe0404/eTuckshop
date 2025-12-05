// /lib/utils/token.ts

export const getAccessToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

export const getRefreshToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
};

export const setAccessToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
};

export const setRefreshToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("refreshToken", token);
};

// ⭐ Combined helper
export const setTokens = (access: string, refresh: string) => {
  setAccessToken(access);
  setRefreshToken(refresh);
};

export const removeTokens = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};
