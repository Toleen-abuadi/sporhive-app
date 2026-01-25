import { ApiError } from '../api/error';

export const resolveAuthErrorMessage = (error, t, fallbackKey = 'auth.errors.generic') => {
  if (!error) return t(fallbackKey);
  const rawMessage = typeof error === 'string' ? error : error?.message;
  const message = String(rawMessage || '').toLowerCase();
  const status = error instanceof ApiError ? error.statusCode : error?.statusCode;
  const code = error instanceof ApiError ? error.code : error?.code;

  if (code === 'NETWORK_ERROR' || status === 0) {
    return t('auth.errors.network');
  }
  if (status === 401 || message.includes('invalid') || message.includes('credentials')) {
    return t('auth.errors.invalidCredentials');
  }
  if (message.includes('deactivated') || message.includes('inactive')) {
    return t('auth.errors.deactivated');
  }
  if (message.includes('otp') || message.includes('code') || message.includes('expired')) {
    return t('auth.errors.invalidOtp');
  }
  return t(fallbackKey);
};
