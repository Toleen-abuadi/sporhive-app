import axios from 'axios';
import Constants from 'expo-constants';
import { storage } from '../storage/storage';
import { handleApiError } from './error';

const resolveBaseUrl = () => {
  const configBase = Constants?.expoConfig?.extra?.API_BASE_URL;
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  const rawBase = configBase || envBase;

  if (!rawBase) {
    const error = new Error('API base URL is not configured.');
    if (__DEV__) {
      console.error(error.message, { configBase, envBase });
    }
    throw error;
  }

  const trimmed = String(rawBase).replace(/\/+$/, '');
  if (!trimmed) {
    const error = new Error('API base URL is not configured.');
    if (__DEV__) {
      console.error(error.message, { configBase, envBase });
    }
    throw error;
  }

  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
};

const API_BASE_URL = resolveBaseUrl();

if (__DEV__) {
  console.info('API base URL:', API_BASE_URL);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const nextConfig = config || {};
    const headers = nextConfig.headers || {};
    const hasAuth =
      !!headers.Authorization ||
      !!headers.authorization ||
      (typeof headers.get === 'function' && (headers.get('Authorization') || headers.get('authorization')));

    if (__DEV__) {
      const method = (nextConfig.method || 'GET').toUpperCase();
      const base = nextConfig.baseURL || API_BASE_URL;
      const url = nextConfig.url || '';
      console.info(`API request: ${method} ${base}${url}`);
    }

    if (!hasAuth) {
      try {
        const token = await storage.getAuthToken();
        if (token) {
          if (typeof headers.set === 'function') {
            headers.set('Authorization', `Bearer ${token}`);
          } else {
            headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to read auth token from storage.', error);
        }
      }
    }

    nextConfig.headers = headers;
    return nextConfig;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(handleApiError(error))
);

export { apiClient, API_BASE_URL };
