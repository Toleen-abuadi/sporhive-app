import axios from 'axios';
import { storage } from '../storage/storage';
import { handleApiError } from './error';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL + '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    // ✅ If caller already set Authorization (portal), NEVER override it.
    const alreadyHasAuth =
      !!config.headers?.Authorization || !!config.headers?.authorization;

    if (!alreadyHasAuth) {
      const token = await storage.getAuthToken(); // app auth token (academy/admin side)
      if (token) config.headers.Authorization = `Bearer ${token}`;
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
