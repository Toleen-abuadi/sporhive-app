// src/services/portal/portal.api.js
import { apiClient } from '../api/client';
import { playerPortalApi } from '../api/playerPortalApi';
import { getPortalAccessToken, getPortalAcademyId } from '../auth/portalSession';
import { storage, PORTAL_KEYS, APP_STORAGE_KEYS } from '../storage/storage';
import { API_BASE_URL_V1 } from '../../config/env';
import { assertTryOutId, getTryOutIdFromPortalSession, isValidTryOutId } from './portal.tryout';

const API_BASE_URL = API_BASE_URL_V1;

const wrapApi = async (fn, label = 'Portal API failed') => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    console.error(label, error);
    return { success: false, error };
  }
};

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  return session && typeof session === 'object' ? session : null;
};

const resolveToken = async (override) => {
  if (override) return override;
  const portalTokens = storage.getPortalTokens ? await storage.getPortalTokens() : null;
  const portalToken =
    portalTokens?.access || portalTokens?.token || portalTokens?.access_token || null;
  if (portalToken) return portalToken;
  const session = await readAuthSession();
  return getPortalAccessToken(session);
};

const resolveAcademyId = async (override) => {
  if (override != null) return Number(override);
  const session = await readAuthSession();
  const sessionAcademy = getPortalAcademyId(session);
  return sessionAcademy != null ? Number(sessionAcademy) : null;
};

const resolveLanguage = async (override) => {
  if (override) return override;
  const lang = await storage.getItem(APP_STORAGE_KEYS.LANGUAGE);
  return typeof lang === 'string' && lang ? lang : 'en';
};

const resolveTryOutId = async (override, { require = false } = {}) => {
  const overrideId = isValidTryOutId(override) ? override : null;
  if (overrideId != null) return overrideId;

  const session = storage.getPortalSession
    ? await storage.getPortalSession()
    : await storage.getItem(PORTAL_KEYS.SESSION);

  const resolved = getTryOutIdFromPortalSession(session);

  if (require) {
    assertTryOutId(resolved);
  }

  return resolved;
};

const buildHeaders = async ({ academyId, token, language } = {}) => {
  const resolvedAcademyId = await resolveAcademyId(academyId);
  const resolvedLanguage = await resolveLanguage(language);

  const headers = { 'Accept-Language': resolvedLanguage };

  if (resolvedAcademyId) {
    headers['X-Academy-Id'] = String(resolvedAcademyId);
    headers['X-Customer-Id'] = String(resolvedAcademyId);
  }

  return { headers, academyId: resolvedAcademyId };
};

/**
 * Adds academy_id/customer_id and ALWAYS injects tryout (if available) into body as:
 * - try_out
 * - try_out_id
 * - tryout_id
 *
 * If requireTryOut = true and we can't resolve it, we throw a clean JS error (no SQLite crash).
 */
const withAcademyPayload = async (payload = {}, options = {}) => {
  const { headers, academyId } = await buildHeaders(options);
  const body = { ...(payload || {}) };

  if (academyId) {
    body.customer_id = academyId;
    body.academy_id = academyId;
  }

  const existingTryOut =
    body.try_out ??
    body.try_out_id ??
    body.tryout_id ??
    null;

  const existingTryOutId = isValidTryOutId(existingTryOut) ? existingTryOut : null;

  const resolvedTryOutId =
    existingTryOutId ??
    (await resolveTryOutId(options?.tryOutId, { require: options?.requireTryOut }));

  // ✅ ALWAYS include all keys if we have a valid tryout id
  if (isValidTryOutId(resolvedTryOutId)) {
    body.try_out = resolvedTryOutId;
    body.try_out_id = resolvedTryOutId;
    body.tryout_id = resolvedTryOutId;
  }

  if (options?.requireTryOut) {
    assertTryOutId(body.try_out ?? body.try_out_id ?? body.tryout_id ?? resolvedTryOutId);
  }

  return { body, headers, tryOutId: resolvedTryOutId };
};

export const portalApi = {
  baseUrl: API_BASE_URL,

  async fetchActiveAcademies() {
    return wrapApi(() => apiClient.post('/customer/active-list', {}), 'Failed to fetch academies');
  },

  async listAcademiesActive() {
    return portalApi.fetchActiveAcademies();
  },

  async login({ academyId, username, password }) {
    return wrapApi(() => {
      const body = {
        academy_id: Number(academyId),
        username: String(username || '').trim(),
        password: String(password || ''),
      };

      return apiClient.post('/player-portal-external-proxy/auth/login', body);
    }, 'Login failed');
  },

  async authMe({ academyId } = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload({}, { academyId });
      return apiClient.post('/player-portal-external-proxy/auth/me', body, { headers });
    }, 'Session verification failed');
  },

  async me({ academyId } = {}) {
    return portalApi.authMe({ academyId });
  },

  /**
   * Overview is fetched via playerPortalApi (custom client).
   * Persisting tryOutId is handled in portal.store after normalization.
   */
  async getOverview({ academyId, externalPlayerId } = {}) {
    if (__DEV__) {
      console.info('Portal overview request', {
        academyId: academyId || null,
        externalPlayerId: externalPlayerId || null,
      });
    }

    const response = await playerPortalApi.getOverview();

    if (__DEV__) {
      console.info('Portal overview response', { ok: response?.success });
    }

    return response;
  },

  async updateProfile(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/player-profile/profile/update', body, { headers });
    }, 'Profile update failed');
  },

  // ---- Renewals / Freezes / Invoices require try_out ----

  async renewalsEligibility(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return apiClient.post('/player-portal-external-proxy/registration/renewals/eligibility', body, { headers });
    }, 'Failed to check renewal eligibility');
  },

  async checkRenewalEligibility(payload = {}, options = {}) {
    return portalApi.renewalsEligibility(payload, options);
  },

  async renewalsRequest(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return apiClient.post('/player-portal-external-proxy/registration/renewals/request', body, { headers });
    }, 'Renewal request failed');
  },

  async submitRenewal(payload = {}, options = {}) {
    return portalApi.renewalsRequest(payload, options);
  },

  async requestFreeze(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return apiClient.post('/player-portal-external-proxy/registration/freezes/request', body, { headers });
    }, 'Freeze request failed');
  },

  async submitFreeze(payload = {}, options = {}) {
    return portalApi.requestFreeze(payload, options);
  },

  async printInvoice(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return apiClient.post('/player-portal-external-proxy/registration/print_invoice', body, {
        headers,
        responseType: 'arraybuffer',
      });
    }, 'Invoice download failed');
  },

  // ---- Performance feedback requires try_out ----

  async getRatingTypes(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return apiClient.post('/player-portal-external-proxy/player-performance/feedback/types', body, { headers });
    }, 'Failed to load rating types');
  },

  async fetchRatingTypes(payload = {}, options = {}) {
    return portalApi.getRatingTypes(payload, options);
  },

  async getRatingSummary(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return apiClient.post('/player-portal-external-proxy/player-performance/feedback/player_summary', body, { headers });
    }, 'Failed to load rating summary');
  },

  async fetchPerformanceSummary(payload = {}, options = {}) {
    return portalApi.getRatingSummary(payload, options);
  },

  async getRatingPeriods(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return apiClient.post('/player-portal-external-proxy/player-performance/feedback/periods', body, { headers });
    }, 'Failed to load rating periods');
  },

  async fetchPerformancePeriods(payload = {}, options = {}) {
    return portalApi.getRatingPeriods(payload, options);
  },

  // ---- Uniforms / News (still include tryout id automatically if available, not required) ----

  async listUniformStore(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/uniforms/store', body, { headers });
    }, 'Failed to fetch uniform store');
  },

  async fetchUniformStore(payload = {}, options = {}) {
    return portalApi.listUniformStore(payload, options);
  },

  async createUniformOrder(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/uniforms/order', body, { headers });
    }, 'Failed to create uniform order');
  },

  async placeUniformOrder(payload = {}, options = {}) {
    return portalApi.createUniformOrder(payload, options);
  },

  async listMyUniformOrders(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/uniforms/my_orders', body, { headers });
    }, 'Failed to fetch uniform orders');
  },

  async fetchMyUniformOrders(payload = {}, options = {}) {
    return portalApi.listMyUniformOrders(payload, options);
  },

  async listNews(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, headers } = await withAcademyPayload(payload, options);
      return apiClient.post('/player-portal-external-proxy/news/list', body, { headers });
    }, 'Failed to fetch news');
  },

  async fetchNews(payload = {}, options = {}) {
    return portalApi.listNews(payload, options);
  },
};
