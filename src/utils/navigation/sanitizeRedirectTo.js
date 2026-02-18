const SAFE_REDIRECT_PREFIXES = [
  '/(app)/',
  '/(portal)/',
  '/playgrounds/',
  '/portal/',
  '/academies/',
  '/services',
];

const BLOCKED_REDIRECT_PREFIXES = ['/(auth)/'];

const SAFE_DEFAULT_POST_LOGIN = '/(app)/services';

const decodeBestEffort = (value) => {
  if (typeof value !== 'string') return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const hasBlockedProtocol = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return true;
  if (normalized.startsWith('//')) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) return true;
  return false;
};

const hasSuspiciousPattern = (value) => {
  const raw = String(value || '');
  return (
    /[\r\n]/.test(raw) ||
    /%0d|%0a/i.test(raw) ||
    raw.includes('\\')
  );
};

const isAllowedPath = (value) => {
  if (!value.startsWith('/')) return false;
  if (BLOCKED_REDIRECT_PREFIXES.some((prefix) => value.startsWith(prefix))) return false;
  return SAFE_REDIRECT_PREFIXES.some((prefix) => value === prefix || value.startsWith(prefix));
};

export const sanitizeRedirectTo = (input) => {
  if (typeof input !== 'string') return null;

  const raw = input.trim();
  if (!raw) return null;
  if (hasSuspiciousPattern(raw)) return null;

  const decodedOnce = decodeBestEffort(raw).trim();
  const decodedTwice = decodeBestEffort(decodedOnce).trim();
  const candidate = decodedTwice || decodedOnce;

  if (!candidate) return null;
  if (hasSuspiciousPattern(candidate)) return null;

  if (hasBlockedProtocol(raw) || hasBlockedProtocol(decodedOnce) || hasBlockedProtocol(candidate)) {
    return null;
  }

  if (!isAllowedPath(candidate)) return null;

  return candidate;
};

export const DEFAULT_POST_LOGIN_ROUTE = SAFE_DEFAULT_POST_LOGIN;

