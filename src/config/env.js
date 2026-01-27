import Constants from 'expo-constants';

const readEnvValue = (key) => {
  if (process?.env) {
    if (key === 'API_BASE_URL' && typeof process.env.EXPO_PUBLIC_API_BASE_URL === 'string') {
      return process.env.EXPO_PUBLIC_API_BASE_URL;
    }
    if (key === 'ENV_NAME' && typeof process.env.EXPO_PUBLIC_ENV_NAME === 'string') {
      return process.env.EXPO_PUBLIC_ENV_NAME;
    }
    if (typeof process.env[key] === 'string') {
      return process.env[key];
    }
  }
  const extraValue = Constants?.expoConfig?.extra?.[key];
  return typeof extraValue === 'string' ? extraValue : null;
};

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
};

const readRequired = (key, validator) => {
  const raw = readEnvValue(key);
  const normalized = validator ? validator(raw) : raw;
  if (!normalized) {
    const message = `Missing or invalid environment variable: ${key}`;
    if (__DEV__) {
      console.error(message, { raw });
    }
    throw new Error(message);
  }
  return normalized;
};

export const ENV_NAME = readRequired('ENV_NAME', (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
});

export const API_BASE_URL = readRequired('API_BASE_URL', normalizeBaseUrl);
export const API_BASE_URL_V1 = `${API_BASE_URL}`;
