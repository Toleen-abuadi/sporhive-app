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
    const token = await storage.getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const handledError = handleApiError(error);
    return Promise.reject(handledError);
  }
);

export { apiClient, API_BASE_URL };
