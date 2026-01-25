import { apiClient } from './client';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';
import {
  resolvePlayerAcademyId,
  resolvePlayerId,
  resolvePlayerPortalToken,
  validatePlayerSession,
} from '../auth/session.utils';

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  return session && typeof session === 'object' ? session : null;
};

const buildOverviewHeaders = (session) => {
  const token = resolvePlayerPortalToken(session);
  const academyId = resolvePlayerAcademyId(session);
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
  const academyId = resolvePlayerAcademyId(session);
  const playerId = resolvePlayerId(session);
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

const attachStatus = (error) => {
  const status =
    error?.response?.status ||
    error?.status ||
    error?.statusCode ||
    error?.meta?.status ||
    null;
  if (status && !error.status) {
    error.status = status;
  }
  return error;
};

export const playerPortalApi = {
  async getOverview(sessionOverride) {
    const session = sessionOverride || (await readAuthSession());
    const validation = validatePlayerSession(session);

    if (!validation.ok) {
      const error = new Error('PLAYER_SESSION_INVALID');
      error.code = 'PLAYER_SESSION_INVALID';
      error.reason = validation.reason;
      return { success: false, error };
    }

    const headers = buildOverviewHeaders(session);
    const payload = buildOverviewPayload(session);

    try {
      const data = await apiClient.post(
        '/player-portal-external-proxy/player-profile/overview',
        payload,
        { headers }
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: attachStatus(error) };
    }
  },
};
