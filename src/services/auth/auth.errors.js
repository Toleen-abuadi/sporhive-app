import { ApiError } from '../api/error';

const toText = (v) => String(v ?? '').trim();
const lower = (v) => toText(v).toLowerCase();

const flattenErrorTexts = (obj) => {
  // Extract likely message fields from many backend shapes
  const parts = [];

  if (!obj) return parts;

  if (typeof obj === 'string') parts.push(obj);
  if (typeof obj?.message === 'string') parts.push(obj.message);
  if (typeof obj?.detail === 'string') parts.push(obj.detail);
  if (typeof obj?.error === 'string') parts.push(obj.error);

  // Some APIs return { data: { field: ["..."] } } or { field: ["..."] }
  const data = obj?.data && typeof obj.data === 'object' ? obj.data : null;
  const merged = data || obj;

  if (merged && typeof merged === 'object') {
    for (const key of Object.keys(merged)) {
      const val = merged[key];
      if (Array.isArray(val)) parts.push(val.join(' '));
      else if (typeof val === 'string') parts.push(val);
    }
  }

  return parts.filter(Boolean);
};

export const resolveAuthErrorMessage = (error, t, fallbackKey = 'auth.errors.generic') => {
  if (!error) return t(fallbackKey);

  // Print exact API response for debugging
  try {
    if (error?.response) console.error('API response:', error.response);
    else console.error('API error:', error);
  } catch (e) {
    console.error('Failed to print API response', e);
  }

  const status = error instanceof ApiError ? error.statusCode : error?.statusCode;
  const code = error instanceof ApiError ? error.code : error?.code;

  const texts = flattenErrorTexts(error);
  const message = lower(texts.join(' | '));

  // Network
  if (code === 'NETWORK_ERROR' || status === 0) {
    return t('auth.errors.network');
  }

  // ✅ BR-007: Phone already exists / unique constraint
  // Covers common shapes:
  // - "phone already exists", "already registered"
  // - "must be unique", "unique constraint"
  // - field errors: { phone: ["This field must be unique."] }
  const phoneExists =
    message.includes('already registered') ||
    (message.includes('already') && message.includes('phone')) ||
    (message.includes('already') && message.includes('number')) ||
    message.includes('phone exists') ||
    message.includes('phone already') ||
    message.includes('must be unique') ||
    (message.includes('unique') && (message.includes('phone') || message.includes('number'))) ||
    (message.includes('duplicate') && (message.includes('phone') || message.includes('number')));

  if (phoneExists) {
    // Expect you to add this i18n key:
    // auth.signup.phoneExists = "This number is already registered. Please use another number or log in."
    return t('auth.signup.phoneExists');
  }

  // Invalid credentials
  if (status === 401 || message.includes('invalid') || message.includes('credentials')) {
    return message;
  }

  // Inactive/deactivated
  if (message.includes('deactivated') || message.includes('inactive')) {
    return t('auth.errors.deactivated');
  }

  // OTP issues
  if (message.includes('otp') || message.includes('code') || message.includes('expired')) {
    return t('auth.errors.invalidOtp');
  }

  return t(fallbackKey);
};
