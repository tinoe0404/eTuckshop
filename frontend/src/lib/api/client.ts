import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';

// ✅ Determine API URL based on environment
const getBaseURL = () => {
  // If explicitly set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // In production on Vercel, must use deployed backend
  if (process.env.NODE_ENV === 'production') {
    return 'https://etuckshop-backend.onrender.com/api';
  }
  
  // Development default
  return 'http://localhost:5000/api';
};

const BASE_URL = getBaseURL();

console.log('🔧 API Configuration:');
console.log('   Base URL:', BASE_URL);
console.log('   Environment:', process.env.NODE_ENV);
console.log('   Next Public API:', process.env.NEXT_PUBLIC_API_URL);

// ✅ Test connection on startup (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const healthUrl = BASE_URL.replace('/api', '') + '/health';
  
  fetch(healthUrl, { 
    method: 'GET',
    mode: 'cors',
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Backend connection successful');
        console.log('   Status:', data.status);
        console.log('   Database:', data.database);
        console.log('   Environment:', data.environment);
      } else {
        console.warn('⚠️ Backend responded but not healthy:', res.status);
      }
    })
    .catch((err) => {
      console.error('❌ Backend not reachable at', BASE_URL);
      console.error('   Make sure your backend server is running!');
      console.error('   Error:', err.message);
      console.error('');
      console.error('   To start backend: cd backend && bun run dev');
    });
}

// ✅ Create axios instance with proper configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  timeout: 30000, // 30 seconds (increased for slow connections)
  withCredentials: true, // CRITICAL: Send cookies with every request
});


// ✅ Request interceptor - add auth info
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get NextAuth session
      const session = await getSession();
      
      // Add user ID to headers if available
      if (session?.user) {
        const userId = session.user.id || (session.user as any).userId;
        if (userId) {
          config.headers['X-User-Id'] = userId;  // ✅ FIXED: 'Id' not 'ID'
          
          // Log in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
            console.log(`   👤 User: ${session.user.email} (ID: ${userId}, Role: ${session.user.role})`);
          }
        } else {
          console.warn('⚠️ Session exists but no user ID found:', session.user);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`📤 ${config.method?.toUpperCase()} ${config.url} (No session)`);
      }
      
      return config;
    } catch (error) {
      console.error('❌ Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    console.error('❌ Request Setup Error:', error);
    return Promise.reject(error);
  }
);

// ✅ Response interceptor - handle errors intelligently
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;
    
    // Enhanced error logging
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout');
      console.error('   URL:', config?.url);
      console.error('   The backend took too long to respond (>30s)');
    } 
    else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('🌐 Network Error - Cannot connect to backend');
      console.error('   URL:', BASE_URL);
      console.error('   Possible causes:');
      console.error('   1. Backend server is not running');
      console.error('   2. Wrong backend URL in .env');
      console.error('   3. CORS is blocking the request');
      console.error('   4. Network/firewall issues');
      console.error('');
      console.error('   💡 Solution:');
      console.error('   • For LOCAL testing: Start backend with "bun run dev"');
      console.error('   • For PRODUCTION: Deploy backend and update NEXT_PUBLIC_API_URL');
    } 
    else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection Refused');
      console.error('   Backend is not accepting connections at:', BASE_URL);
      console.error('   Start backend server: cd backend && bun run dev');
    } 
    else if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const method = config?.method?.toUpperCase();
      const url = config?.url;
      
      console.error(`❌ ${method} ${url} - ${status}`);
      
      if (status === 401) {
        console.log('🔒 Unauthorized - Session expired or invalid');
        
        // Sign out user (only in browser)
        if (typeof window !== 'undefined') {
          console.log('   Redirecting to login...');
          await signOut({ redirect: true, callbackUrl: '/login' });
        }
      }
      else if (status === 403) {
        console.error('🚫 Forbidden - Insufficient permissions');
        console.error('   Data:', error.response.data);
      }
      else if (status === 404) {
        console.error('🔍 Not Found');
        console.error('   Data:', error.response.data);
      }
      else if (status === 500) {
        console.error('💥 Internal Server Error');
        console.error('   Data:', error.response.data);
      }
      else {
        console.error('   Data:', error.response.data);
      }
    } 
    else if (error.request) {
      console.error('❌ No response received from server');
      console.error('   Request was sent but server did not respond');
      console.error('   This usually means the backend is down or unreachable');
    } 
    else {
      console.error('❌ Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;