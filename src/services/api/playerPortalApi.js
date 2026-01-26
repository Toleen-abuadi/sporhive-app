import { apiClient } from './client';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';
import {
  getPortalAccessToken,
  getPortalAcademyId,
  getPortalPlayerId,
  validatePortalSession,
} from '../auth/portalSession';

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  if (!session || typeof session !== 'object') return null;
  const portalTokens = storage.getPortalTokens ? await storage.getPortalTokens() : null;
  if (!portalTokens) return session;
  return { ...session, portal_tokens: portalTokens };
};

const buildPortalHeaders = (session) => {
  const token = getPortalAccessToken(session);
  const academyId = getPortalAcademyId(session);
  const headers = {
    'Content-Type': 'application/json',
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

const buildOverviewPayload = (session) => {
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

  return payload;
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

export const playerPortalApi = {
  async getOverview(sessionOverride) {
    const session = sessionOverride || (await readAuthSession());
    const validation = validatePortalSession(session);

    if (!validation.ok) {
      const error = new Error('PORTAL_SESSION_INVALID');
      error.code = 'PORTAL_SESSION_INVALID';
      error.kind = 'PORTAL_SESSION_INVALID';
      error.reason = validation.reason;
      return { success: false, error };
    }

    const headers = buildPortalHeaders(session);
    const payload = buildOverviewPayload(session);

    try {
      const data = await apiClient.post(
        '/player-portal-external-proxy/player-profile/overview',
        payload,
        { headers }
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: normalizePortalError(error) };
    }
  },
};
