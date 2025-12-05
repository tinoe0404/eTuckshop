import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // ✅ CRITICAL: Send cookies with every request
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
    // Cookies are automatically included, no need to manually add Authorization header
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors (expired access token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // If the failed request was the refresh endpoint itself, don't retry
      if (originalRequest.url?.includes('/auth/refresh')) {
        isRefreshing = false;
        processQueue(error);
        
        // Clear auth state and redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint (refreshToken cookie is automatically sent)
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {}, // Empty body, token comes from cookie
          { withCredentials: true }
        );

        // Token refreshed successfully (new accessToken cookie is set)
        isRefreshing = false;
        processQueue();

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        isRefreshing = false;
        processQueue(refreshError);

        if (typeof window !== 'undefined') {
          // Clear any client-side state
          localStorage.clear();
          sessionStorage.clear();
          
          // Redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;