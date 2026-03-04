import { storage, APP_STORAGE_KEYS, PORTAL_KEYS } from '../storage/storage';
import {
  getPortalAcademyId,
  getPortalPlayerId,
  getToken,
  isTokenExpired,
  validatePortalSession,
} from '../auth/portalSession';
import { normalizePortalOverview, normalizeUniformOrders } from '../portal/portal.normalize';
import { assertTryOutId, getTryOutIdFromPortalSession, isValidTryOutId } from '../portal/portal.tryout';
import { runPortalReauthOnce } from '../auth/auth.store';
import { API_BASE_URL_V1 } from '../../config/env';
import { apiClient } from './client';
import { resolvePortalAcademyId } from './portalHeaders';
import { isTokenExpiredReason } from '../portal/portal.errors';

const API_BASE_URL = API_BASE_URL_V1;
const DEBUG_PORTAL_PIPELINE = true;

const logPortalPipeline = (event, payload = {}) => {
  if (!DEBUG_PORTAL_PIPELINE) return;
  console.info(`[playerPortalApi] ${event}`, payload);
};

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
  const explicitKind = error?.kind || error?.code || null;
  const status =
    error?.response?.status ||
    error?.status ||
    error?.statusCode ||
    error?.meta?.status ||
    null;

  let kind;
  if (explicitKind) {
    kind = explicitKind;
  } else if (status === 401) {
    kind = 'PORTAL_REAUTH_REQUIRED';
  } else if (status === 403) {
    kind = 'PORTAL_FORBIDDEN';
  } else {
    kind = fallbackKind;
  }
  const normalized = error instanceof Error ? error : new Error(error?.message || 'Portal request failed');
  normalized.status = status;
  normalized.kind = kind;
  return normalized;
};

const shouldAttemptPortalReauth = (error) => {
  const status =
    error?.response?.status ||
    error?.status ||
    error?.statusCode ||
    error?.meta?.status ||
    null;
  const kind = error?.kind || error?.code || null;
  const alreadyRetried = Boolean(error?.config?._portalRetried || error?.config?.meta?.portalRetried);

  if (kind === 'AUTH_TOKEN_EXPIRED') return false;
  if (kind === 'PORTAL_REAUTH_FAILED' || alreadyRetried) return false;

  if (status === 401) return true;
  if (kind === 'PORTAL_REAUTH_REQUIRED' || kind === 'PORTAL_SESSION_INVALID') return true;
  if (kind === 'PORTAL_ACADEMY_REQUIRED' || kind === 'PORTAL_ACADEMY_MISSING') return true;
  if (kind === 'PORTAL_TOKEN_MISSING' || kind === 'PORTAL_AUTH_REQUIRED') return true;
  if (kind === 'APP_TOKEN_MISSING' || kind === 'REAUTH_REQUIRED') return true;
  return false;
};

const isExpiredValidation = (validation, session) => {
  if (isTokenExpiredReason(validation?.reason)) return true;
  return isTokenExpired(getToken(session));
};

const createAuthTokenExpiredError = (context = {}) => {
  const error = new Error('AUTH_TOKEN_EXPIRED');
  error.code = 'AUTH_TOKEN_EXPIRED';
  error.kind = 'AUTH_TOKEN_EXPIRED';
  error.reason = 'token_expired';
  error.context = context;
  return error;
};

const createPortalSessionInvalidError = (validation, session) => {
  const error = new Error('PORTAL_SESSION_INVALID');
  error.code = 'PORTAL_SESSION_INVALID';
  error.kind = 'PORTAL_SESSION_INVALID';
  error.reason = validation.reason;
  error.context = {
    validationReason: validation?.reason || null,
    loginAs: session?.login_as || session?.user?.type || null,
    academyId: getPortalAcademyId(session),
    playerId: getPortalPlayerId(session),
    hasToken: Boolean(getToken(session)),
  };
  return error;
};

const ensureSession = async (sessionOverride, options = {}) => {
  const source = options?.source || 'portal';
  let session = sessionOverride || (await readAuthSession());
  let portalSession = await readPortalSession();
  let validation = validatePortalSession(session, { portalSession });

  if (validation.ok) {
    return session;
  }

  const missingBeforeThrow = {
    source,
    reason: validation.reason,
    academyId: getPortalAcademyId(session),
    playerId: getPortalPlayerId(session),
    loginAs: session?.login_as || session?.user?.type || null,
    hasToken: Boolean(getToken(session)),
    isExpired: isExpiredValidation(validation, session),
  };
  logPortalPipeline('ensureSession:invalid', missingBeforeThrow);

  if (options?.allowReauth === false) {
    if (isExpiredValidation(validation, session)) {
      throw createAuthTokenExpiredError({
        source,
        step: 'validate',
        reason: validation.reason,
        academyId: getPortalAcademyId(session),
        playerId: getPortalPlayerId(session),
      });
    }
    throw createPortalSessionInvalidError(validation, session);
  }

  const reauthResult = await runPortalReauthOnce({
    source: `ensureSession:${source}`,
    reason: validation.reason,
  });
  logPortalPipeline('ensureSession:reauthResult', {
    source,
    success: reauthResult?.success === true,
    reason: reauthResult?.reason || null,
  });

  if (!reauthResult?.success) {
    if (isTokenExpiredReason(reauthResult?.reason) || isExpiredValidation(validation, session)) {
      throw createAuthTokenExpiredError({
        source,
        step: 'reauth',
        reason: reauthResult?.reason || validation.reason || 'token_expired',
        academyId: getPortalAcademyId(session),
        playerId: getPortalPlayerId(session),
      });
    }
    const error = createPortalSessionInvalidError(validation, session);
    error.reauthReason = reauthResult?.reason || 'reauth_failed';
    throw error;
  }

  session = sessionOverride || (await readAuthSession());
  portalSession = await readPortalSession();
  validation = validatePortalSession(session, { portalSession });
  if (!validation.ok) {
    if (isExpiredValidation(validation, session)) {
      throw createAuthTokenExpiredError({
        source,
        step: 'post_reauth_validate',
        reason: validation.reason,
        academyId: getPortalAcademyId(session),
        playerId: getPortalPlayerId(session),
      });
    }
    throw createPortalSessionInvalidError(validation, session);
  }

  return session;
};

// ---------- Portal request helper (uses shared apiClient) ----------

const executePortalRequestWithRetry = async (requestFactory, meta = {}) => {
  const label = meta?.label || 'portal-request';
  try {
    return await requestFactory({ refreshAttempted: false, retried: false });
  } catch (error) {
    if (!shouldAttemptPortalReauth(error)) {
      throw error;
    }

    logPortalPipeline('request:reauthNeeded', {
      label,
      kind: error?.kind || error?.code || null,
      status: error?.status || error?.response?.status || null,
    });

    const reauthResult = await runPortalReauthOnce({
      source: `request:${label}`,
      reason: error?.kind || error?.code || error?.status || 'portal_request_failed',
    });

    if (!reauthResult?.success) {
      logPortalPipeline('request:reauthFailed', {
        label,
        reason: reauthResult?.reason || null,
      });

      if (isTokenExpiredReason(reauthResult?.reason)) {
        const expiredError = createAuthTokenExpiredError({
          source: `request:${label}`,
          reason: reauthResult?.reason || 'token_expired',
          status: error?.status || error?.response?.status || null,
        });
        expiredError.status = 401;
        expiredError.response = { status: 401, data: error?.response?.data || null };
        throw expiredError;
      }

      const normalized = normalizePortalError(error);
      normalized.kind = 'PORTAL_REAUTH_FAILED';
      normalized.code = 'PORTAL_REAUTH_FAILED';
      normalized.reauthReason = reauthResult?.reason || 'reauth_failed';
      throw normalized;
    }

    logPortalPipeline('request:retryingOnce', { label });
    return requestFactory({ refreshAttempted: true, retried: true });
  }
};

const portalPost = (path, body, options = {}) => {
  const { portal, ...rest } = options || {};
  return executePortalRequestWithRetry(
    ({ refreshAttempted, retried }) =>
      apiClient.post(path, body != null ? body : {}, {
        ...rest,
        meta: {
          ...(rest.meta || {}),
          portalRefreshAttempted: Boolean(refreshAttempted),
          portalRetried: Boolean(retried),
        },
        portal,
        _portalRefreshAttempted: Boolean(refreshAttempted),
        _portalRetried: Boolean(retried),
      }),
    { label: `POST:${path}` }
  );
};

/**
 * FIX: previously ignored `body` completely.
 * We need academy_id/customer_id for tenant resolution (auth/me, etc).
 * We send it as query params for GET.
 */
const portalGet = (path, params, options = {}) => {
  const { portal, ...rest } = options || {};
  return executePortalRequestWithRetry(
    ({ refreshAttempted, retried }) =>
      apiClient.get(path, {
        ...rest,
        meta: {
          ...(rest.meta || {}),
          portalRefreshAttempted: Boolean(refreshAttempted),
          portalRetried: Boolean(retried),
        },
        params: params != null ? params : {},
        portal,
        _portalRefreshAttempted: Boolean(refreshAttempted),
        _portalRetried: Boolean(retried),
      }),
    { label: `GET:${path}` }
  );
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
  let academyId = await resolvePortalAcademyId(options);
  if (!academyId) {
    logPortalPipeline('withAcademyPayload:missingAcademyId', {
      optionsAcademyId: options?.academyId ?? null,
      hasPayloadAcademy: Boolean(payload?.academy_id || payload?.customer_id),
    });

    const reauthResult = await runPortalReauthOnce({
      source: 'withAcademyPayload',
      reason: 'missing_academy_id',
    });

    if (reauthResult?.success) {
      academyId = await resolvePortalAcademyId(options);
    } else if (isTokenExpiredReason(reauthResult?.reason)) {
      throw createAuthTokenExpiredError({
        source: 'withAcademyPayload',
        reason: reauthResult?.reason || 'token_expired',
      });
    }
  }

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
    try {
      const session = await ensureSession(sessionOverride, { source: 'getOverviewRaw' });
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
      if (__DEV__) console.trace('[TRACE] overview network request fired');
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
      const session = await ensureSession(sessionOverride, { source: 'getOverview' });

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
      if (__DEV__) console.trace('[TRACE] overview network request fired');
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
      const session = await ensureSession(sessionOverride, { source: 'listOrders' });

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
      const session = await ensureSession(sessionOverride, { source: 'listRenewals' });

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
      const session = await ensureSession(sessionOverride, { source: 'submitRenewal' });

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
      const session = await ensureSession(sessionOverride, { source: 'printInvoice' });

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
      return portalGet('/player-portal-external-proxy/auth/me', body, { portal });
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
      const session = await ensureSession(options?.sessionOverride, { source: 'updateProfile' });
      const playerId = getPortalPlayerId(session);

      const withPlayer = {
        ...(payload || {}),
        ...(playerId ? { player_id: Number(playerId), external_player_id: Number(playerId) } : {}),
      };

      const { body, portal } = await withAcademyPayload(withPlayer, {
        ...options,
        requireTryOut: true,
      });

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
