import axios from 'axios';
import { storage } from '../storage/storage';
import { handleApiError } from '../api/error';

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const API_BASE_URL = BASE + '/api/v1/public-users';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(handleApiError(error))
);

const resolveLanguage = async (override) => {
  if (override) return override;
  const lang = await storage.getLanguage?.();
  return lang || 'en';
};

const buildHeaders = async ({ language, contentType = 'application/json' } = {}) => {
  const resolvedLanguage = await resolveLanguage(language);
  return {
    Accept: 'application/json',
    'Accept-Language': resolvedLanguage,
    'Content-Type': contentType,
  };
};

const wrapApi = async (fn, label) => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    console.error(label, error);
    return { success: false, error };
  }
};

export const publicUsersApi = {
  baseUrl: API_BASE_URL,

  login(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return client.post('/login', payload, { headers });
    }, 'Failed to login public user');
  },

  register(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return client.post('/register', payload, { headers });
    }, 'Failed to register public user');
  },

  resetRequest(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return client.post('/password-reset/request', payload, { headers });
    }, 'Failed to request password reset');
  },

  resetConfirm(payload = {}, options = {}) {
    return wrapApi(async () => {
      const headers = await buildHeaders(options);
      return client.post('/password-reset/confirm', payload, { headers });
    }, 'Failed to confirm password reset');
  },
};
