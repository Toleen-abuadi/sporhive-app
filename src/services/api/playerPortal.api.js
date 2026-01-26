import { apiClient } from './client';
import { storage, APP_STORAGE_KEYS, PORTAL_KEYS } from '../storage/storage';
import {
  getPortalAccessToken,
  getPortalAcademyId,
  getPortalPlayerId,
  validatePortalSession,
} from '../auth/portalSession';
import { normalizePortalOverview, normalizeUniformOrders } from '../portal/portal.normalize';
import { assertTryOutId, getTryOutIdFromPortalSession, isValidTryOutId } from '../portal/portal.tryout';

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  return session && typeof session === 'object' ? session : null;
};

const readLanguage = async () => {
  const lang = await storage.getItem(APP_STORAGE_KEYS.LANGUAGE);
  return typeof lang === 'string' && lang ? lang : 'en';
};

const buildPortalHeaders = async (session) => {
  const token = getPortalAccessToken(session);
  const academyId = getPortalAcademyId(session);
  const language = await readLanguage();

  const headers = {
    'Content-Type': 'application/json',
    'Accept-Language': language,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (academyId) {
    headers['X-Academy-Id'] = String(academyId);
    headers['X-Customer-Id'] = String(academyId);
  }

  return headers;
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

const buildPortalPayload = async (session, payload = {}, options = {}) => {
  const academyId = getPortalAcademyId(session);
  const playerId = getPortalPlayerId(session);
  const body = { ...(payload || {}) };

  if (academyId) {
    body.academy_id = Number(academyId);
    body.customer_id = Number(academyId);
  }

  if (playerId) {
    body.player_id = playerId;
    body.external_player_id = playerId;
  }

  const resolvedTryOutId = await resolveTryOutId(options?.tryOutId, { require: options?.requireTryOut });
  if (isValidTryOutId(resolvedTryOutId) && body.try_out == null) {
    body.try_out = resolvedTryOutId;
  }
  if (isValidTryOutId(resolvedTryOutId) && body.tryout_id == null && body.try_out_id == null) {
    body.tryout_id = resolvedTryOutId;
  }

  if (options?.requireTryOut) {
    assertTryOutId(body.try_out ?? body.try_out_id ?? body.tryout_id ?? resolvedTryOutId);
  }

  return body;
};

const normalizeError = (error, fallbackKind = 'PORTAL_ERROR') => {
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

export const playerPortalApi = {
  async getOverview(sessionOverride) {
    try {
      const session = await ensureSession(sessionOverride);
      const headers = await buildPortalHeaders(session);
      const payload = await buildPortalPayload(session);
      const data = await apiClient.post('/player-portal-external-proxy/player-profile/overview', payload, { headers });
      return { success: true, data: normalizePortalOverview(data) };
    } catch (error) {
      return { success: false, error: normalizeError(error, 'PORTAL_OVERVIEW_ERROR') };
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
      const headers = await buildPortalHeaders(session);
      const body = await buildPortalPayload(session, payload);
      const data = await apiClient.post('/player-portal-external-proxy/uniforms/my_orders', body, { headers });
      return { success: true, data: normalizeUniformOrders(data) };
    } catch (error) {
      return { success: false, error: normalizeError(error, 'PORTAL_ORDERS_ERROR') };
    }
  },
  async listRenewals(sessionOverride, payload = {}) {
    try {
      const session = await ensureSession(sessionOverride);
      const headers = await buildPortalHeaders(session);
      const body = await buildPortalPayload(session, payload, { requireTryOut: true });
      const data = await apiClient.post('/player-portal-external-proxy/registration/renewals/eligibility', body, { headers });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: normalizeError(error, 'PORTAL_RENEWALS_ERROR') };
    }
  },
  async submitRenewal(sessionOverride, payload = {}) {
    try {
      const session = await ensureSession(sessionOverride);
      const headers = await buildPortalHeaders(session);
      const body = await buildPortalPayload(session, payload, { requireTryOut: true });
      const data = await apiClient.post('/player-portal-external-proxy/registration/renewals/request', body, { headers });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: normalizeError(error, 'PORTAL_RENEWALS_SUBMIT_ERROR') };
    }
  },
  async printInvoice(sessionOverride, payload = {}) {
    try {
      const session = await ensureSession(sessionOverride);
      const headers = await buildPortalHeaders(session);
      const body = await buildPortalPayload(session, payload, { requireTryOut: true });
      const data = await apiClient.post('/player-portal-external-proxy/registration/print_invoice', body, {
        headers,
        responseType: 'arraybuffer',
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: normalizeError(error, 'PORTAL_INVOICE_ERROR') };
    }
  },
};
