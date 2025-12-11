// lib/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ✅ Explicitly set the base URL with fallback
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://etuckshop-backend.onrender.com';

console.log('🔧 API Base URL:', BASE_URL); // Debug log

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // ✅ Increased to 30s for Render cold starts
  withCredentials: true, // ✅ Essential for httpOnly cookies
});

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor - cookies are automatically sent via withCredentials
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // ✅ Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => {
    // ✅ Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    // ✅ Better error logging
    if (error.response) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error('❌ No response received:', error.message);
    } else {
      console.error('❌ Request setup error:', error.message);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors (expired access token)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      
      // If the failed request was the refresh endpoint itself, don't retry
      if (originalRequest.url?.includes('/auth/refresh')) {
        console.log('🔄 Refresh token expired, logging out...');
        isRefreshing = false;
        processQueue(error);
        
        // Clear auth state and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        console.log('⏳ Queueing request while refreshing...');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 Attempting to refresh token...');
        // Call refresh endpoint (refreshToken cookie is automatically sent)
        const response = await axios.post(
          `${BASE_URL}/api/auth/refresh`, // ✅ Use full path with /api prefix
          {},
          { 
            withCredentials: true,
            timeout: 30000 // ✅ Longer timeout for cold starts
          }
        );

        console.log('✅ Token refreshed successfully');
        isRefreshing = false;
        processQueue();

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        isRefreshing = false;
        processQueue(refreshError);

        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;