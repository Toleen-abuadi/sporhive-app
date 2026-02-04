import { storage, APP_STORAGE_KEYS, PORTAL_KEYS } from '../storage/storage';
import { getPortalAcademyId, getPortalPlayerId, validatePortalSession } from '../auth/portalSession';
import { normalizePortalOverview, normalizeUniformOrders } from '../portal/portal.normalize';
import { assertTryOutId, getTryOutIdFromPortalSession, isValidTryOutId } from '../portal/portal.tryout';
import { API_BASE_URL_V1 } from '../../config/env';
import { apiClient } from './client';
import { resolvePortalAcademyId } from './portalHeaders';

const API_BASE_URL = API_BASE_URL_V1;

// ---------- Shared helpers ----------

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

const readPortalSession = async () => {
  if (storage.getPortalSession) return storage.getPortalSession();
  return storage.getItem(PORTAL_KEYS.SESSION);
};

const resolveTryOutId = async (override, { require = false } = {}) => {
  const overrideId = isValidTryOutId(override) ? override : null;
  if (overrideId != null) return overrideId;

  const portalSession = await readPortalSession();
  const resolved = getTryOutIdFromPortalSession(portalSession);

  if (require) {
    assertTryOutId(resolved);
  }

  return resolved;
};

const normalizePortalError = (error, fallbackKind = 'PORTAL_ERROR') => {
  const status =
    error?.response?.status ||
    error?.status ||
    error?.statusCode ||
    error?.meta?.status ||
    null;

  const kind = status === 401 || status === 403 ? 'PORTAL_FORBIDDEN' : fallbackKind;
  const normalized = error instanceof Error ? error : new Error(error?.message || 'Portal request failed');
  normalized.status = status;
  normalized.kind = kind;
  return normalized;
};

const ensureSession = async (sessionOverride) => {
  const session = sessionOverride || (await readAuthSession());
  const validation = validatePortalSession(session);

  if (!validation.ok) {
    const error = new Error('PORTAL_SESSION_INVALID');
    error.code = 'PORTAL_SESSION_INVALID';
    error.kind = 'PORTAL_SESSION_INVALID';
    error.reason = validation.reason;
    throw error;
  }

  return session;
};

// ---------- Portal request helper (uses shared apiClient) ----------

const portalPost = (path, body, options = {}) => {
  const { portal, ...rest } = options || {};
  return apiClient.post(path, body != null ? body : {}, { ...rest, portal });
};

// ---------- Payload helpers ----------

/**
 * Adds academy_id/customer_id and injects tryout id consistently (when available) into:
 * - try_out
 * - try_out_id
 * - tryout_id
 *
 * If requireTryOut = true and we can't resolve it, we throw a clean JS error.
 */
const withAcademyPayload = async (payload = {}, options = {}) => {
  const academyId = await resolvePortalAcademyId(options);
  if (!academyId) {
    const error = new Error('Portal academy id required');
    error.kind = 'PORTAL_ACADEMY_REQUIRED';
    throw error;
  }
  const body = { ...(payload || {}) };

  if (academyId) {
    body.customer_id = Number(academyId);
    body.academy_id = Number(academyId);
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

  if (isValidTryOutId(resolvedTryOutId)) {
    body.try_out = resolvedTryOutId;
    body.try_out_id = resolvedTryOutId;
    body.tryout_id = resolvedTryOutId;
  }

  if (options?.requireTryOut) {
    assertTryOutId(body.try_out ?? body.try_out_id ?? body.tryout_id ?? resolvedTryOutId);
  }

  return { body, academyId, tryOutId: resolvedTryOutId, portal: { academyId } };
};

// ---------- Player Portal API (session-aware, normalized where appropriate) ----------

export const playerPortalApi = {
  /**
   * Raw overview (kept for backward-compat with older callers).
   */
  async getOverviewRaw(sessionOverride) {
    const session = sessionOverride || (await readAuthSession());
    const validation = validatePortalSession(session);

    if (!validation.ok) {
      const error = new Error('PORTAL_SESSION_INVALID');
      error.code = 'PORTAL_SESSION_INVALID';
      error.kind = 'PORTAL_SESSION_INVALID';
      error.reason = validation.reason;
      return { success: false, error };
    }

    const academyId = getPortalAcademyId(session);
    const playerId = getPortalPlayerId(session);

    const payload = {};
    if (academyId) {
      payload.academy_id = Number(academyId);
      payload.customer_id = Number(academyId);
    }
    if (playerId) {
      payload.player_id = playerId;
      payload.external_player_id = playerId;
    }

    try {
      const portal = academyId ? { academyId } : undefined;
      const data = await portalPost('/player-portal-external-proxy/player-profile/overview', payload, { portal });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: normalizePortalError(error) };
    }
  },

  /**
   * Normalized overview (equivalent to the previous playerPortal.api.js behavior).
   */
  async getOverview(sessionOverride) {
    try {
      const session = await ensureSession(sessionOverride);

      const academyId = getPortalAcademyId(session);
      const playerId = getPortalPlayerId(session);

      const payload = {};
      if (academyId) {
        payload.academy_id = Number(academyId);
        payload.customer_id = Number(academyId);
      }
      if (playerId) {
        payload.player_id = playerId;
        payload.external_player_id = playerId;
      }

      const portal = academyId ? { academyId } : undefined;
      const data = await portalPost('/player-portal-external-proxy/player-profile/overview', payload, { portal });
      return { success: true, data: normalizePortalOverview(data) };
    } catch (error) {
      return { success: false, error: normalizePortalError(error, 'PORTAL_OVERVIEW_ERROR') };
    }
  },

  async getProfile(sessionOverride) {
    const res = await playerPortalApi.getOverview(sessionOverride);
    if (!res.success) return res;

    const overview = res.data;
    return {
      success: true,
      data: {
        player: overview?.player || null,
        registration: overview?.registration || null,
        health: overview?.health || null,
        academyName: overview?.academyName || '',
      },
    };
  },

  async listPayments(sessionOverride) {
    const res = await playerPortalApi.getOverview(sessionOverride);
    if (!res.success) return res;
    return { success: true, data: res.data?.payments || [] };
  },

  async listOrders(sessionOverride, payload = {}) {
    try {
      const session = await ensureSession(sessionOverride);

      const playerId = getPortalPlayerId(session);
      const { body, portal } = await withAcademyPayload(
        { ...(payload || {}), ...(playerId ? { player_id: playerId, external_player_id: playerId } : {}) },
        {}
      );

      const data = await portalPost('/player-portal-external-proxy/uniforms/my_orders', body, { portal });
      return { success: true, data: normalizeUniformOrders(data) };
    } catch (error) {
      return { success: false, error: normalizePortalError(error, 'PORTAL_ORDERS_ERROR') };
    }
  },

  async listRenewals(sessionOverride, payload = {}) {
    try {
      const session = await ensureSession(sessionOverride);

      const playerId = getPortalPlayerId(session);
      const { body, portal } = await withAcademyPayload(
        { ...(payload || {}), ...(playerId ? { player_id: playerId, external_player_id: playerId } : {}) },
        { requireTryOut: true }
      );

      const data = await portalPost('/player-portal-external-proxy/registration/renewals/eligibility', body, { portal });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: normalizePortalError(error, 'PORTAL_RENEWALS_ERROR') };
    }
  },

  async submitRenewal(sessionOverride, payload = {}) {
    try {
      const session = await ensureSession(sessionOverride);

      const playerId = getPortalPlayerId(session);
      const { body, portal } = await withAcademyPayload(
        { ...(payload || {}), ...(playerId ? { player_id: playerId, external_player_id: playerId } : {}) },
        { requireTryOut: true }
      );

      const data = await portalPost('/player-portal-external-proxy/registration/renewals/request', body, { portal });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: normalizePortalError(error, 'PORTAL_RENEWALS_SUBMIT_ERROR') };
    }
  },

  async printInvoice(sessionOverride, payload = {}) {
    try {
      const session = await ensureSession(sessionOverride);

      const playerId = getPortalPlayerId(session);
      const { body, portal } = await withAcademyPayload(
        { ...(payload || {}), ...(playerId ? { player_id: playerId, external_player_id: playerId } : {}) },
        { requireTryOut: true }
      );

      const data = await portalPost('/player-portal-external-proxy/registration/print_invoice', body, {
        responseType: 'arraybuffer',
        portal,
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: normalizePortalError(error, 'PORTAL_INVOICE_ERROR') };
    }
  },
};

// ---------- Portal API (formerly src/services/portal/portal.api.js) ----------

export const portalApi = {
  baseUrl: API_BASE_URL,

  async fetchActiveAcademies() {
    return wrapApi(() => portalPost('/customer/active-list', {}), 'Failed to fetch academies');
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

      return portalPost('/player-portal-external-proxy/auth/login', body, {
        portal: academyId ? { academyId } : undefined,
      });
    }, 'Login failed');
  },

  async authMe({ academyId } = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload({}, { academyId, requireTryOut: false });
      return portalPost('/player-portal-external-proxy/auth/me', body, { portal });
    }, 'Session verification failed');
  },

  async me({ academyId } = {}) {
    return portalApi.authMe({ academyId });
  },

  /**
   * Overview is fetched via playerPortalApi.
   * Using the RAW variant to preserve older portalApi return shape.
   */
  async getOverview({ academyId, externalPlayerId } = {}) {
    if (__DEV__) {
      console.info('Portal overview request', {
        academyId: academyId || null,
        externalPlayerId: externalPlayerId || null,
      });
    }

    const response = await playerPortalApi.getOverviewRaw();

    if (__DEV__) {
      console.info('Portal overview response', { ok: response?.success });
    }

    return response;
  },

  async updateProfile(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, options);
      return portalPost('/player-portal-external-proxy/player-profile/profile/update', body, { portal });
    }, 'Profile update failed');
  },

  // ---- Renewals / Freezes / Invoices require try_out ----

  async renewalsEligibility(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return portalPost('/player-portal-external-proxy/registration/renewals/eligibility', body, { portal });
    }, 'Failed to check renewal eligibility');
  },

  async checkRenewalEligibility(payload = {}, options = {}) {
    return portalApi.renewalsEligibility(payload, options);
  },

  async renewalsRequest(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return portalPost('/player-portal-external-proxy/registration/renewals/request', body, { portal });
    }, 'Renewal request failed');
  },

  async submitRenewal(payload = {}, options = {}) {
    return portalApi.renewalsRequest(payload, options);
  },

  async requestFreeze(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return portalPost('/player-portal-external-proxy/registration/freezes/request', body, { portal });
    }, 'Freeze request failed');
  },

  async submitFreeze(payload = {}, options = {}) {
    return portalApi.requestFreeze(payload, options);
  },

  async printInvoice(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return portalPost('/player-portal-external-proxy/registration/print_invoice', body, {
        responseType: 'arraybuffer',
        portal,
      });
    }, 'Invoice download failed');
  },

  // ---- Performance feedback requires try_out ----

  async getRatingTypes(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return portalPost('/player-portal-external-proxy/player-performance/feedback/types', body, { portal });
    }, 'Failed to load rating types');
  },

  async fetchRatingTypes(payload = {}, options = {}) {
    return portalApi.getRatingTypes(payload, options);
  },

  async getRatingSummary(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return portalPost('/player-portal-external-proxy/player-performance/feedback/player_summary', body, { portal });
    }, 'Failed to load rating summary');
  },

  async fetchPerformanceSummary(payload = {}, options = {}) {
    return portalApi.getRatingSummary(payload, options);
  },

  async getRatingPeriods(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, { ...options, requireTryOut: true });
      return portalPost('/player-portal-external-proxy/player-performance/feedback/periods', body, { portal });
    }, 'Failed to load rating periods');
  },

  async fetchPerformancePeriods(payload = {}, options = {}) {
    return portalApi.getRatingPeriods(payload, options);
  },

  // ---- Uniforms / News ----

  async listUniformStore(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, options);
      return portalPost('/player-portal-external-proxy/uniforms/store', body, { portal });
    }, 'Failed to fetch uniform store');
  },

  async fetchUniformStore(payload = {}, options = {}) {
    return portalApi.listUniformStore(payload, options);
  },

  async createUniformOrder(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, options);
      return portalPost('/player-portal-external-proxy/uniforms/order', body, { portal });
    }, 'Failed to create uniform order');
  },

  async placeUniformOrder(payload = {}, options = {}) {
    return portalApi.createUniformOrder(payload, options);
  },

  async listMyUniformOrders(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, options);
      return portalPost('/player-portal-external-proxy/uniforms/my_orders', body, { portal });
    }, 'Failed to fetch uniform orders');
  },

  async fetchMyUniformOrders(payload = {}, options = {}) {
    return portalApi.listMyUniformOrders(payload, options);
  },

  async listNews(payload = {}, options = {}) {
    return wrapApi(async () => {
      const { body, portal } = await withAcademyPayload(payload, options);
      return portalPost('/player-portal-external-proxy/news/list', body, { portal });
    }, 'Failed to fetch news');
  },

  async fetchNews(payload = {}, options = {}) {
    return portalApi.listNews(payload, options);
  },
};
