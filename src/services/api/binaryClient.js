import axios from 'axios';
import { storage } from '../storage/storage';
import { handleApiError } from './error';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL + '/api/v1';

const binaryClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

binaryClient.interceptors.request.use(async (config) => {
  const token = await storage.getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

binaryClient.interceptors.response.use(
  (response) => response, // keep full response for binary
  (error) => Promise.reject(handleApiError(error))
);

export { binaryClient, API_BASE_URL };
