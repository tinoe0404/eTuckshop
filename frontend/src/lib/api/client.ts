// File: src/lib/api/client.ts (UPDATED FOR NEXTAUTH)

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://etuckshop-backend.onrender.com/api';

console.log('🔧 API Base URL:', BASE_URL);

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  withCredentials: true, // For cookies if backend still uses them
});

// Request interceptor - add NextAuth session token to headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get NextAuth session
    const session = await getSession();
    
    if (session?.user) {
      // You can add custom headers if needed
      // For example, if your backend expects a user ID header:
      // config.headers['X-User-ID'] = session.user.id;
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