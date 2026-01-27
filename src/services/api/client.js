import axios from 'axios';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';
import {
  getPortalAccessToken,
  getPortalAcademyId,
  refreshPortalSessionIfNeeded,
} from '../auth/portalSession';
import { handleApiError } from './error';
import { API_BASE_URL_V1 } from '../../config/env';

const API_BASE_URL = API_BASE_URL_V1;

if (__DEV__) {
  console.info('API base URL:', API_BASE_URL);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  return session && typeof session === 'object' ? session : null;
};

const getAppAccessToken = async (session) => {
  const sessionToken =
    session?.tokens?.access ||
    session?.tokens?.token ||
    session?.token ||
    session?.access ||
    session?.access_token ||
    session?.authToken ||
    null;
  const storedToken = await storage.getAuthToken();
  return sessionToken || storedToken || null;
};

const getPortalAccessTokenForRequest = async (session) => {
  const portalTokens = storage.getPortalTokens ? await storage.getPortalTokens() : null;
  const portalToken =
    portalTokens?.access || portalTokens?.token || portalTokens?.access_token || null;
  return portalToken || getPortalAccessToken(session);
};

const stripAuthHeaders = (headers) => {
  if (!headers) return;
  if (typeof headers.delete === 'function') {
    headers.delete('Authorization');
    headers.delete('authorization');
  } else {
    delete headers.Authorization;
    delete headers.authorization;
  }
};

const getExistingAuthHeader = (headers) => {
  if (!headers) return null;
  if (typeof headers.get === 'function') {
    return headers.get('Authorization') || headers.get('authorization') || null;
  }
  return (
    headers.Authorization ||
    headers.authorization ||
    headers['Authorization'] ||
    headers['authorization'] ||
    null
  );
};

const setAuthHeader = (headers, token) => {
  if (!headers || !token) return;
  if (typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.Authorization = `Bearer ${token}`;
  }
};

apiClient.interceptors.request.use(
  async (config) => {
    const nextConfig = config || {};
    const headers = nextConfig.headers || {};
    const path = resolveRequestPath(nextConfig);
    const scope = classifyEndpoint(path);
    const method = (nextConfig.method || 'GET').toUpperCase();

    if (__DEV__) {
      const base = nextConfig.baseURL || API_BASE_URL;
      const url = nextConfig.url || '';
      console.info(`API request: ${method} ${base}${url}`);
    }

    try {
      if (scope === 'public' || scope === 'auth') {
        stripAuthHeaders(headers);
        if (__DEV__) {
          console.info('API auth scope', { method, path, scope, token: 'none' });
        }
      } else if (scope === 'portal') {
        const session = await readAuthSession();
        const academyId = getPortalAcademyId(session);

        const existingAuth = getExistingAuthHeader(headers);
        if (!existingAuth) {
          const portalToken = await getPortalAccessTokenForRequest(session);
          if (!portalToken) {
            const error = new Error('Portal token required');
            error.kind = 'PORTAL_AUTH_REQUIRED';
            throw error;
          }
          setAuthHeader(headers, portalToken);
        }

        if (!academyId) {
          const error = new Error('Portal academy id required');
          error.kind = 'PORTAL_ACADEMY_REQUIRED';
          throw error;
        }

        headers['X-Academy-Id'] = String(academyId);
        headers['X-Customer-Id'] = String(academyId);

        if (__DEV__) {
          console.info('API auth scope', { method, path, scope, token: 'portal', academyId });
        }
      } else {
        const session = await readAuthSession();

        const existingAuth = getExistingAuthHeader(headers);
        if (!existingAuth) {
          const token = await getAppAccessToken(session);
          if (!token) {
            const error = new Error('App access token required');
            error.kind = 'AUTH_REQUIRED';
            throw error;
          }
          setAuthHeader(headers, token);
        }

        if (__DEV__) {
          console.info('API auth scope', { method, path, scope, token: 'app' });
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('API auth attachment failed', {
          method,
          path,
          scope,
          error: error?.kind || error?.message,
        });
      }
      return Promise.reject(error);
    }

    nextConfig.headers = headers;
    return nextConfig;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const nextError = handleApiError(error);
    const status =
      nextError?.response?.status ||
      nextError?.status ||
      nextError?.statusCode ||
      nextError?.meta?.status ||
      null;
    const config = nextError?.config || error?.config;
    const path = resolveRequestPath(config);
    const scope = classifyEndpoint(path);

    if ((status === 401 || status === 403) && config && scope === 'portal' && !config._portalRetry) {
      config._portalRetry = true;
      const refreshResult = await refreshPortalSessionIfNeeded(undefined, { force: true });
      if (refreshResult?.success) {
        const portalAccessToken = await getPortalAccessTokenForRequest(refreshResult.session);
        const academyId = getPortalAcademyId(refreshResult.session);
        if (portalAccessToken && academyId) {
          config.headers = config.headers || {};
          setAuthHeader(config.headers, portalAccessToken);
          config.headers['X-Academy-Id'] = String(academyId);
          config.headers['X-Customer-Id'] = String(academyId);
          return apiClient(config);
        }
      }

      const forbiddenError = nextError instanceof Error ? nextError : new Error('Portal access denied');
      forbiddenError.kind = 'PORTAL_REAUTH_REQUIRED';
      forbiddenError.status = status;
      return Promise.reject(forbiddenError);
    }

    if (status === 401 || status === 403) {
      const authError = nextError instanceof Error ? nextError : new Error('Authentication required');
      authError.kind = scope === 'portal' ? 'PORTAL_REAUTH_REQUIRED' : 'REAUTH_REQUIRED';
      authError.status = status;
      return Promise.reject(authError);
    }

    return Promise.reject(nextError);
  }
);

export { apiClient, API_BASE_URL };
