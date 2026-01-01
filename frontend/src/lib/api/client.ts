import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { getSession, signOut } from 'next-auth/react';

// ============================================
// API URL CONFIG
// ============================================

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === 'production')
    return 'https://etuckshop-backend.onrender.com/api';
  return 'http://localhost:5000/api';
};

const BASE_URL = getBaseURL();

// ============================================
// HEALTH CHECK (DEV ONLY)
// ============================================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const healthUrl = BASE_URL.replace('/api', '') + '/health';

  fetch(healthUrl)
    .then(res => res.ok && res.json())
    .then(data => console.log('✅ Backend OK:', data))
    .catch(() =>
      console.error('❌ Backend not reachable – start backend with bun run dev')
    );
}

// ============================================
// REQUEST DEDUPLICATION
// ============================================

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();

const getRequestKey = (config: InternalAxiosRequestConfig) => {
  const method = config.method?.toUpperCase() || 'GET';
  const url = config.url || '';

  let payload = '';
  if (config.data) payload = JSON.stringify(config.data);
  else if (config.params) payload = JSON.stringify(config.params);

  return `${method}:${url}:${payload}`;
};

// ============================================
// AXIOS INSTANCE
// ============================================

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR
// ============================================

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const key = getRequestKey(config);
    const existing = pendingRequests.get(key);

    if (existing) {
      throw { isDuplicate: true, originalPromise: existing.promise };
    }

    const session = await getSession();
    if (session?.user?.id) {
      config.headers['X-User-Id'] = session.user.id;
    }

    return config;
  },
  error => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

apiClient.interceptors.response.use(
  res => {
    const key = getRequestKey(res.config as InternalAxiosRequestConfig);
    pendingRequests.delete(key);
    return res;
  },
  async error => {
    if (error.isDuplicate) return error.originalPromise;

    const config = error.config as InternalAxiosRequestConfig | undefined;
    if (config) pendingRequests.delete(getRequestKey(config));

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      await signOut({ redirect: true, callbackUrl: '/login' });
    }

    return Promise.reject(error);
  }
);

// ============================================
// TYPESAFE REQUEST OVERRIDE
// ============================================

const originalRequest = apiClient.request.bind(apiClient);

apiClient.request = function <
  T = any,
  R = AxiosResponse<T>,
  D = any
>(config: AxiosRequestConfig<D>): Promise<R> {
  const key = getRequestKey(config as InternalAxiosRequestConfig);

  const promise = originalRequest<T, R, D>(config);

  pendingRequests.set(key, { promise, timestamp: Date.now() });

  promise.finally(() => pendingRequests.delete(key));

  return promise;
};

// ============================================
// EXPORT
// ============================================

export default apiClient;
