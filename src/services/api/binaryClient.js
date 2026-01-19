// src/services/api/client.js
import axios from 'axios';
import { storage } from '../storage/storage';
import { handleApiError } from './error';
import { API_BASE_URL } from './client';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  async (config) => {
    // Axios v1 may use AxiosHeaders (has get/set)
    const headers = config?.headers || {};

    const existingAuth =
      (typeof headers.get === 'function' && (headers.get('Authorization') || headers.get('authorization'))) ||
      headers.Authorization ||
      headers.authorization ||
      headers['Authorization'] ||
      headers['authorization'];

    // ✅ If caller already set Authorization (portal), NEVER override it.
    if (!existingAuth) {
      try {
        const token = await storage.getAuthToken(); // app auth token (academy/admin side)
        if (token) {
          if (typeof headers.set === 'function') headers.set('Authorization', `Bearer ${token}`);
          else headers.Authorization = `Bearer ${token}`;
          config.headers = headers;
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to read auth token from storage.', error);
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(handleApiError(error))
);

export { apiClient, API_BASE_URL };
