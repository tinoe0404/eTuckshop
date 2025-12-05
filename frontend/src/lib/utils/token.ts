// /lib/utils/token.ts

/**
 * ⚠️ NOTE: With httpOnly cookies, frontend JavaScript CANNOT access tokens directly.
 * These utility functions are kept for backwards compatibility and edge cases,
 * but the primary token storage is now httpOnly cookies managed by the backend.
 * 
 * The cookies are automatically sent with every request via axios withCredentials: true
 */

/**
 * Check if user has access token cookie (client-side only)
 * This is a basic check - the actual validation happens on the backend
 */
export const hasAccessToken = (): boolean => {
  if (typeof window === "undefined") return false;
  
  // Check if accessToken cookie exists
  const cookies = document.cookie.split(';');
  return cookies.some(cookie => cookie.trim().startsWith('accessToken='));
};

/**
 * Check if user has refresh token cookie (client-side only)
 */
export const hasRefreshToken = (): boolean => {
  if (typeof window === "undefined") return false;
  
  const cookies = document.cookie.split(';');
  return cookies.some(cookie => cookie.trim().startsWith('refreshToken='));
};

/**
 * Check if user is authenticated (has cookies)
 */
export const isAuthenticated = (): boolean => {
  return hasAccessToken() && hasRefreshToken();
};

/**
 * @deprecated - Tokens are now stored in httpOnly cookies
 * Keeping these for backwards compatibility but they won't work with httpOnly cookies
 */
export const getAccessToken = () => {
  console.warn('getAccessToken() is deprecated - tokens are now in httpOnly cookies');
  return null;
};

export const getRefreshToken = () => {
  console.warn('getRefreshToken() is deprecated - tokens are now in httpOnly cookies');
  return null;
};

export const setAccessToken = (token: string) => {
  console.warn('setAccessToken() is deprecated - tokens are set by backend as httpOnly cookies');
};

export const setRefreshToken = (token: string) => {
  console.warn('setRefreshToken() is deprecated - tokens are set by backend as httpOnly cookies');
};

export const setTokens = (access: string, refresh: string) => {
  console.warn('setTokens() is deprecated - tokens are set by backend as httpOnly cookies');
};

export const removeTokens = () => {
  console.warn('removeTokens() is deprecated - tokens are cleared by backend logout endpoint');
  // Clear any remaining localStorage items
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
};