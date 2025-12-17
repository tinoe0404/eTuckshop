import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';

// ✅ Use localhost in development, production URL in production
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

console.log('🔧 API Base URL:', BASE_URL);

// ✅ Test connection on startup (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const healthUrl = BASE_URL.replace('/api', '') + '/health';
  fetch(healthUrl, { method: 'GET' })
    .then((res) => {
      if (res.ok) {
        console.log('✅ Backend connection successful at', BASE_URL);
      } else {
        console.warn('⚠️ Backend responded but not healthy:', res.status);
      }
    })
    .catch((err) => {
      console.error('❌ Backend not reachable at', BASE_URL);
      console.error('   Make sure your backend server is running!');
      console.error('   Error:', err.message);
    });
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 seconds
  withCredentials: true,
});

// Request interceptor - add NextAuth session token to headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get NextAuth session
      const session = await getSession();
      
      if (session?.user) {
        // Add user ID to headers for customer routes that need it
        config.headers['X-User-ID'] = session.user.id || session.user.userId;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      return config;
    } catch (error) {
      console.error('❌ Error in request interceptor:', error);
      // Continue with request even if session fetch fails
      return config;
    }
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors with detailed logging
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    // Enhanced error logging based on error type
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout - backend took too long to respond');
      console.error('   Consider increasing timeout or checking backend performance');
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('🌐 Network error - Cannot connect to backend');
      console.error('   Possible causes:');
      console.error('   1. Backend server is not running');
      console.error('   2. Wrong backend URL:', BASE_URL);
      console.error('   3. CORS is blocking the request');
      console.error('   4. Network/firewall issues');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused - Backend server is not accepting connections');
      console.error('   Make sure backend is running at:', BASE_URL);
    } else if (error.message.includes('aborted')) {
      console.error('🛑 Request aborted');
      console.error('   This can happen if:');
      console.error('   1. Component unmounted during request');
      console.error('   2. User navigated away');
      console.error('   3. Request was manually cancelled');
    } else if (error.response) {
      // Server responded with error status
      console.error(
        `❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      // Request made but no response
      console.error('❌ No response received:', error.message);
      console.error('   Request was sent but server did not respond');
    } else {
      // Error in setting up request
      console.error('❌ Request setup error:', error.message);
    }

    // Handle 401 errors - sign out user
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - signing out...');
      
      // Only sign out if in browser (not during SSR)
      if (typeof window !== 'undefined') {
        await signOut({ redirect: true, callbackUrl: '/login' });
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;