import { storage, APP_STORAGE_KEYS } from '../storage/storage';
import { API_BASE_URL_V1 } from '../../config/env';

const resolveApiBaseUrl = () => {
  return API_BASE_URL_V1;
};

export const getPortalAccessToken = (session) =>
  session?.portal_tokens?.access ||
  session?.portal_tokens?.access_token ||
  session?.portalAccessToken ||
  session?.token ||
  null;

export const getPortalRefreshToken = (session) =>
  session?.portal_tokens?.refresh ||
  session?.portal_tokens?.refresh_token ||
  null;

export const getPortalAcademyId = (session) =>
  session?.user?.academy_id ||
  session?.user?.academyId ||
  session?.academyId ||
  null;

export const getPortalPlayerId = (session) =>
  session?.user?.external_player_id ||
  session?.user?.externalPlayerId ||
  session?.user?.player_id ||
  session?.user?.id ||
  null;

export const validatePortalSession = (session) => {
  if (!session) {
    return { ok: false, reason: 'missing_session' };
  }

  const loginAs = session.login_as || session.user?.type || session.userType || null;
  if (loginAs !== 'player') {
    return { ok: false, reason: 'not_player' };
  }

  const academyId = getPortalAcademyId(session);
  if (!academyId) {
    return { ok: false, reason: 'missing_academy_id' };
  }

  const portalAccessToken = getPortalAccessToken(session);
  if (!portalAccessToken) {
    return { ok: false, reason: 'missing_portal_access' };
  }

  return { ok: true };
};

const readStoredSession = async () => {
  if (storage.ensureSecureMigration) {
    await storage.ensureSecureMigration();
  }
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  const authToken = storage.getAuthToken ? await storage.getAuthToken() : null;
  const portalTokens = await storage.getPortalTokens();
  if (!session || typeof session !== 'object') return null;
  const next = { ...session };
  // ONE TOKEN: if token wasn't persisted inside AUTH_SESSION, hydrate it from secure storage
  if (!next.token && authToken) {
   next.token = authToken;
  }
  if (portalTokens) {
    next.portal_tokens = portalTokens;
  }
  // ✅ ensure academy id exists for portal flows
  const existingAcademyId = getPortalAcademyId(next);
  if (!existingAcademyId) {
   const lastAcademyRaw = await storage.getItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID);
    const lastAcademyId = lastAcademyRaw != null ? Number(lastAcademyRaw) : null;
    if (lastAcademyId) {
      next.academyId = lastAcademyId;
      // also mirror into user shape if possible (keeps downstream code stable)
      next.user = {
       ...(next.user || {}),
        academy_id: next.user?.academy_id ?? lastAcademyId,
      };
    }
  }
  return next;
};

const persistSession = async (session) => {
  if (!session) return;
  if (session.portal_tokens) {
    await storage.setPortalTokens(session.portal_tokens);
  }
  const { portal_tokens, portalAccessToken, ...safeSession } = session;
  await storage.setItem(APP_STORAGE_KEYS.AUTH_SESSION, safeSession);
};

const requestPortalRefresh = async (refreshToken) => {
  const baseUrl = resolveApiBaseUrl();
  if (!baseUrl) {
    return { success: false, error: new Error('API base URL is not configured') };
  }

  try {
    const response = await fetch(`${baseUrl}/player-portal-external-proxy/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const error = new Error(`Portal refresh failed (${response.status})`);
      error.status = response.status;
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

export const refreshPortalSessionIfNeeded = async (sessionOverride, options = {}) => {
  const { force = false } = options;
  const session = sessionOverride || (await readStoredSession());
  const validation = validatePortalSession(session);
  if (validation.ok && !force) {
    return { success: true, session };
  }

  if (!session || (!force && validation.reason !== 'missing_portal_access')) {
    return { success: false, reason: validation.reason, session };
  }

  const refreshToken = getPortalRefreshToken(session);
  if (!refreshToken) {
    return { success: false, reason: 'missing_refresh', session };
  }

  const refreshResult = await requestPortalRefresh(refreshToken);
  if (!refreshResult.success) {
    return { success: false, reason: 'refresh_failed', session, error: refreshResult.error };
  }

  const tokens = refreshResult.data?.portal_tokens || refreshResult.data?.tokens || refreshResult.data || null;
  const nextAccessToken =
    tokens?.access || tokens?.access_token || refreshResult.data?.access || refreshResult.data?.access_token || null;

  if (!nextAccessToken) {
    return { success: false, reason: 'missing_portal_access', session };
  }

  const nextSession = {
    ...session,
    portal_tokens: {
      ...(session.portal_tokens || {}),
      ...(tokens || {}),
      access: nextAccessToken,
    },
  };

  await persistSession(nextSession);

  return { success: true, session: nextSession };
};
