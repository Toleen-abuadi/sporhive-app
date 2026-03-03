const DEFAULT_MESSAGE_ALLOWLIST = [
  /^invalid (username|credentials|password)/i,
  /^username or password is incorrect\.?$/i,
  /^please check the entered values\.?$/i,
  /^account is deactivated\.?$/i,
];

const TECHNICAL_TEXT_PATTERNS = [
  /\[object object\]/i,
  /\bobject object\b/i,
  /\bapi error\b/i,
  /\bhttp error\b/i,
  /\btypeerror\b/i,
  /\breferenceerror\b/i,
  /\bsyntaxerror\b/i,
  /\bstack\b/i,
  /\btraceback\b/i,
  /\baxios\b/i,
  /\bfetch\b/i,
  /\brequest failed\b/i,
  /\bstatus code\b/i,
  /\bsql\b/i,
  /<html/i,
];

const toText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeText = (value) => toText(value).replace(/\s+/g, ' ');

const getStatusCode = (error) =>
  error?.statusCode ??
  error?.status ??
  error?.response?.status ??
  error?.meta?.status ??
  error?.details?.status ??
  null;

const getErrorCode = (error) =>
  normalizeText(
    error?.code ??
      error?.kind ??
      error?.name ??
      error?.response?.data?.code ??
      error?.meta?.code
  ).toUpperCase();

const pushIfString = (list, value) => {
  const text = normalizeText(value);
  if (!text) return;
  list.push(text);
};

const collectMessages = (error) => {
  const messages = [];

  if (!error) return messages;
  if (typeof error === 'string') return [normalizeText(error)];

  pushIfString(messages, error?.message);
  pushIfString(messages, error?.detail);
  pushIfString(messages, error?.error);

  const responseData = error?.response?.data;
  if (typeof responseData === 'string') {
    pushIfString(messages, responseData);
  } else if (responseData && typeof responseData === 'object') {
    pushIfString(messages, responseData?.message);
    pushIfString(messages, responseData?.detail);
    pushIfString(messages, responseData?.error);
  }

  const details = error?.details;
  if (details && typeof details === 'object') {
    pushIfString(messages, details?.message);
    pushIfString(messages, details?.detail);
    pushIfString(messages, details?.error);
  }

  return messages.filter(Boolean);
};

const isNetworkError = (status, code, messages) => {
  if (status === 0) return true;

  const networkCodes = new Set(['NETWORK_ERROR', 'ECONNABORTED', 'ETIMEDOUT', 'TIMEOUT']);
  if (networkCodes.has(code)) return true;

  return messages.some((message) =>
    /\b(network|timeout|timed out|offline|internet|failed to fetch|network request failed)\b/i.test(
      message
    )
  );
};

const isTechnicalMessage = (message) =>
  TECHNICAL_TEXT_PATTERNS.some((pattern) => pattern.test(message));

const matchesAllowlist = (message, allowlist) =>
  allowlist.some((entry) => {
    if (entry instanceof RegExp) return entry.test(message);
    return normalizeText(entry).toLowerCase() === message.toLowerCase();
  });

export function normalizeApiError(error, t, options = {}) {
  const status = getStatusCode(error);
  const code = getErrorCode(error);
  const flow = normalizeText(options?.flow).toLowerCase();
  const allowlist = Array.isArray(options?.allowlist)
    ? options.allowlist
    : DEFAULT_MESSAGE_ALLOWLIST;
  const messages = collectMessages(error);

  if (flow === 'login' && (status === 401 || status === 403)) {
    return t('auth.errors.invalidCredentials');
  }

  if (isNetworkError(status, code, messages)) {
    return t('common.errors.network');
  }

  for (const message of messages) {
    if (isTechnicalMessage(message)) continue;
    if (matchesAllowlist(message, allowlist)) return message;
  }

  return t('common.errors.generic');
}
