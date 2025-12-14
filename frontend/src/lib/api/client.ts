// File: src/lib/api/client.ts (FIXED)

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';

// ✅ Use localhost in development, production URL in production
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

console.log('🔧 API Base URL:', BASE_URL);

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  withCredentials: true, // Critical for sending cookies cross-origin
});

// Request interceptor - add NextAuth session token to headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
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
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error('❌ No response received:', error.message);
    } else {
      console.error('❌ Request setup error:', error.message);
    }

    // Handle 401 errors - sign out user
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - signing out...');
      
      // Sign out via NextAuth
      await signOut({ redirect: true, callbackUrl: '/login' });
    }

    return Promise.reject(error);
  }
);

export default apiClient;