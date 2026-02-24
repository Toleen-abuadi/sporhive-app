import { storage, APP_STORAGE_KEYS } from '../storage/storage';
import { getAppAuthHeaders } from './appHeaders';
import { getPortalAuthHeaders } from './portalHeaders';
import { ApiError } from './error';
import { API_BASE_URL_V1 } from '../../config/env';

const API_BASE_URL = API_BASE_URL_V1;

if (__DEV__) {
  console.info('API base URL:', API_BASE_URL);
}

const PUBLIC_PATH_PREFIXES = [
  '/public/',
  '/public-users/',
  '/playgrounds/public/',
  '/academies',
  '/academies/',
  '/customer/active-list',
];

const AUTH_PATH_PREFIXES = ['/app-auth/'];

const PORTAL_PATH_PREFIX = '/player-portal-external-proxy/';

const resolveRequestPath = (config) => {
  const base = config?.baseURL || API_BASE_URL;
  const url = config?.url || '';
  try {
    if (/^https?:\/\//i.test(url)) {
      return new URL(url).pathname;
    }
    return new URL(url, base).pathname;
  } catch {
    return url || '';
  }
};

const classifyEndpoint = (path) => {
  if (!path) return 'app';
  if (path.includes(PORTAL_PATH_PREFIX)) return 'portal';
  if (AUTH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return 'auth';
  if (PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return 'public';
  if (path.startsWith('/playgrounds/admin/')) return 'app';
  return 'app';
};

const normalizeHeaders = (headers) => {
  if (!headers) return {};
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const obj = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  return { ...(headers || {}) };
};

const removeHeader = (headers, name) => {
  if (!headers) return;
  const target = name.toLowerCase();
  Object.keys(headers).forEach((key) => {
    if (key.toLowerCase() === target) {
      delete headers[key];
    }
  });
};

const hasHeader = (headers, name) => {
  if (!headers) return false;
  const target = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
};

const readLanguage = async () => {
  const lang = await storage.getItem(APP_STORAGE_KEYS.LANGUAGE);
  return typeof lang === 'string' && lang ? lang : null;
};

const resolveRequestUrl = (config) => {
  const base = config?.baseURL || API_BASE_URL;
  const url = config?.url || '';
  if (/^https?:\/\//i.test(url)) return url;
  if (!base) return url;
  const baseTrimmed = String(base).replace(/\/+$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseTrimmed}${path}`;
};

const appendParams = (url, params) => {
  if (!params) return url;
  if (typeof params === 'string') {
    return url.includes('?') ? `${url}&${params}` : `${url}?${params}`;
  }

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) search.append(key, String(item));
      });
      return;
    }
    search.append(key, String(value));
  });

  const qs = search.toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

const DEBUG_API = !__DEV__ || true;
// ✅ For preview APK, __DEV__ is often false.
// Set true temporarily, then revert to `__DEV__`.

const redact = (value) => {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  if (value.length <= 6) return '***';
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
};

const sanitizeForLog = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const copy = JSON.parse(JSON.stringify(obj));
    const SENSITIVE_KEYS = [
      'password',
      'player_password',
      'current_password',
      'new_password',
      'token',
      'access',
      'refresh',
      'access_token',
      'academy_access',
      'authorization',
    ];
    const walk = (x) => {
      if (!x || typeof x !== 'object') return;
      Object.keys(x).forEach((k) => {
        const v = x[k];
        if (SENSITIVE_KEYS.includes(String(k).toLowerCase())) {
          x[k] = typeof v === 'string' ? redact(v) : '***';
          return;
        }
        if (typeof v === 'object') walk(v);
      });
    };
    walk(copy);
    return copy;
  } catch {
    return { note: 'failed to sanitize log payload' };
  }
};

const nowMs = () => (global?.performance?.now ? performance.now() : Date.now());


const buildBody = (method, data, headers) => {
  if (method === 'GET' || method === 'HEAD') return undefined;
  if (data == null) return undefined;

  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    if (hasHeader(headers, 'Content-Type')) {
      // Let fetch set the boundary for multipart form data.
      removeHeader(headers, 'Content-Type');
    }
    return data;
  }

  if (typeof data === 'string' || data instanceof ArrayBuffer) {
    return data;
  }

  if (!hasHeader(headers, 'Content-Type')) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    return JSON.stringify(data);
  } catch {
    return undefined;
  }
};

const parseResponseBody = async (res, responseType) => {
  if (res.status === 204 || res.status === 205) return null;

  if (responseType === 'arraybuffer') {
    try {
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (isJson) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    return await res.text();
  } catch {
    return null;
  }
};

const createApiError = (message, status, payload, config, kind) => {
  const meta = {
    status,
    data: payload ?? null,
    url: config?.url ?? null,
    baseURL: config?.baseURL ?? null,
    method: config?.method ?? null,
  };

  const error = new ApiError(message, kind || 'HTTP_ERROR', status, meta);
  error.status = status;
  error.response = { status, data: payload };
  error.config = config;
  if (kind) {
    error.kind = kind;
  }
  return error;
};

const clearPortalSessionOnAuthFailure = async (status, scope) => {
  if (scope !== 'portal') return;
  if (status !== 401 && status !== 403) return;

  try {
    await Promise.all([
      typeof storage.logoutPortal === 'function'
        ? storage.logoutPortal()
        : Promise.resolve(),
      storage.removeItem(APP_STORAGE_KEYS.AUTH_SESSION),
      typeof storage.removeAuthToken === 'function'
        ? storage.removeAuthToken().catch(() => { })
        : Promise.resolve(),
    ]);
    if (DEBUG_API) {
      console.warn('[apiClient] cleared portal session after auth failure', { status });
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[apiClient] failed clearing portal session after auth failure', {
        status,
        error: String(error?.message || error),
      });
    }
  }
};

const apiRequest = async (config = {}) => {
  const nextConfig = { ...config };
  const method = String(nextConfig.method || 'GET').toUpperCase();
  const path = resolveRequestPath(nextConfig);
  const scope = classifyEndpoint(path);
  const baseURL = nextConfig.baseURL || API_BASE_URL;
  const url = appendParams(resolveRequestUrl(nextConfig), nextConfig.params);

  const headers = normalizeHeaders(nextConfig.headers);
  removeHeader(headers, 'Authorization');

  if (scope === 'portal') {
    const portalHeaders = await getPortalAuthHeaders(nextConfig.portal || {});
    Object.assign(headers, portalHeaders);
  } else if (scope === 'auth') {
    const appHeaders = await getAppAuthHeaders({ allowMissingToken: true });
    Object.assign(headers, appHeaders);
  } else if (scope === 'app') {
    const appHeaders = await getAppAuthHeaders();
    Object.assign(headers, appHeaders);
  }

  if (scope === 'portal' || scope === 'app' || scope === 'auth') {
    const language = await readLanguage();
    if (language && !hasHeader(headers, 'Accept-Language')) {
      headers['Accept-Language'] = language;
    }
  }

  const startedAt = nowMs();

  if (DEBUG_API) {
    console.info('[apiClient] request', {
      method,
      scope,
      path,
      url,
      baseURL,
      headers: sanitizeForLog(headers),
      params: sanitizeForLog(nextConfig.params),
      data: sanitizeForLog(nextConfig.data),
    });
  }

  const body = buildBody(method, nextConfig.data, headers);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: nextConfig.signal,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const networkError = new ApiError(
      'Network error. Please check your connection.',
      'NETWORK_ERROR',
      0,
      {
        status: 0,
        data: null,
        url: nextConfig?.url ?? null,
        baseURL,
        method,
      }
    );
    networkError.request = { url, method };
    throw networkError;
  }

  const payload = await parseResponseBody(response, nextConfig.responseType);

  if (DEBUG_API) {
    const tookMs = Math.round(nowMs() - startedAt);
    console.info('[apiClient] response', {
      method,
      scope,
      path,
      url,
      status: response.status,
      ok: response.ok,
      tookMs,
      payload: typeof payload === 'string' ? payload.slice(0, 500) : sanitizeForLog(payload),
    });
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && (payload.message || payload.error || payload.detail)) ||
      (typeof payload === 'string' && payload) ||
      response.statusText ||
      `Request failed (${response.status})`;

    // IMPORTANT: Portal screens must distinguish 401 vs 403.
    // - 401 => reauth/logout flow
    // - 403 => forbidden messaging WITHOUT logout
    let kind;
    if (scope === 'portal') {
      if (response.status === 401) kind = 'PORTAL_REAUTH_REQUIRED';
      if (response.status === 403) kind = 'PORTAL_FORBIDDEN';
    } else if (response.status === 401 || response.status === 403) {
      // Preserve existing app behavior (single reauth kind) outside portal.
      kind = 'REAUTH_REQUIRED';
    }

    await clearPortalSessionOnAuthFailure(response.status, scope);

    throw createApiError(message, response.status, payload, {
      url: nextConfig?.url ?? null,
      baseURL,
      method,
      headers,
    }, kind);
  }

  return payload;
};

const apiClient = {
  request: apiRequest,
  get: (url, config = {}) => apiRequest({ ...config, url, method: 'GET' }),
  delete: (url, config = {}) => apiRequest({ ...config, url, method: 'DELETE' }),
  post: (url, data, config = {}) => apiRequest({ ...config, url, method: 'POST', data }),
  put: (url, data, config = {}) => apiRequest({ ...config, url, method: 'PUT', data }),
  patch: (url, data, config = {}) => apiRequest({ ...config, url, method: 'PATCH', data }),
};

export { apiClient, API_BASE_URL };
