import { storage, APP_STORAGE_KEYS, PORTAL_KEYS } from '../storage/storage';
import { resolveAppToken } from '../api/appHeaders';
import { API_BASE_URL_V1 } from '../../config/env';
import { extractTryOutIdFromOverview, isValidTryOutId } from '../portal/portal.tryout';

const PORTAL_OVERVIEW_PATH = '/player-portal-external-proxy/player-profile/overview';
const PORTAL_AUTH_ME_PATH = '/player-portal-external-proxy/auth/me';
const PORTAL_EXPIRY_GRACE_MS = 30_000;
const DEBUG_PORTAL_SESSION = __DEV__;

const maskToken = (token) => {
  if (!token) return null;
  const value = String(token);
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
};

const logPortalSession = (event, payload = {}) => {
  if (!DEBUG_PORTAL_SESSION) return;
  console.info(`[portalSession] ${event}`, payload);
};

const sessionReasonCode = (reason) => {
  switch (reason) {
    case 'expired':
      return 'TOKEN_EXPIRED';
    case 'missing_portal_access':
      return 'TOKEN_MISSING';
    case 'missing_session':
      return 'SESSION_MISSING';
    case 'missing_academy_id':
      return 'ACADEMY_MISSING';
    case 'missing_player_context':
      return 'PLAYER_CONTEXT_MISSING';
    case 'not_player':
      return 'NOT_PLAYER';
    default:
      return String(reason || 'UNKNOWN');
  }
};

const normalizeNumber = (value) => {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

const normalizePlayerId = (value) => {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const text = String(value).trim();
  return text || null;
};

const toPlayerLoginAs = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  return normalized;
};

const pickAcademyIdFromOverview = (payload, fallback) => {
  const candidates = [
    payload?.player_data?.player_info?.academy_id,
    payload?.player_data?.player_info?.academyId,
    payload?.player_data?.registration_info?.academy_id,
    payload?.player_data?.registration_info?.customer_id,
    payload?.academy_id,
    payload?.customer_id,
    fallback,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeNumber(candidate);
    if (normalized != null && normalized > 0) return normalized;
  }
  return null;
};

const pickPlayerIdFromOverview = (payload, fallback) => {
  const playerInfo = payload?.player_data?.player_info || {};
  const candidates = [
    playerInfo?.external_player_id,
    playerInfo?.externalPlayerId,
    playerInfo?.player_id,
    playerInfo?.id,
    payload?.player_id,
    fallback,
  ];

  for (const candidate of candidates) {
    const normalized = normalizePlayerId(candidate);
    if (normalized != null) return normalized;
  }
  return null;
};

const pickAcademyIdFromAuthPayload = (payload, fallback) => {
  const candidates = [
    payload?.academy_id,
    payload?.academyId,
    payload?.customer_id,
    payload?.customerId,
    payload?.user?.academy_id,
    payload?.user?.academyId,
    payload?.data?.academy_id,
    payload?.data?.academyId,
    payload?.data?.customer_id,
    fallback,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeNumber(candidate);
    if (normalized != null && normalized > 0) return normalized;
  }
  return null;
};

const pickPlayerIdFromAuthPayload = (payload, fallback) => {
  const candidates = [
    payload?.external_player_id,
    payload?.externalPlayerId,
    payload?.player_id,
    payload?.playerId,
    payload?.user?.external_player_id,
    payload?.user?.externalPlayerId,
    payload?.user?.player_id,
    payload?.user?.playerId,
    payload?.data?.external_player_id,
    payload?.data?.externalPlayerId,
    payload?.data?.player_id,
    payload?.data?.playerId,
    fallback,
  ];
  for (const candidate of candidates) {
    const normalized = normalizePlayerId(candidate);
    if (normalized != null) return normalized;
  }
  return null;
};

const buildOverviewRequestBody = ({ academyId, playerId }) => {
  const body = {};
  if (academyId != null) {
    body.academy_id = Number(academyId);
    body.customer_id = Number(academyId);
  }
  if (playerId != null) {
    body.player_id = playerId;
    body.external_player_id = playerId;
  }
  return body;
};

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  return session && typeof session === 'object' ? session : null;
};

const readPortalSession = async () => {
  const session = await storage.getItem(PORTAL_KEYS.SESSION);
  return session && typeof session === 'object' ? session : null;
};

const readStoredAcademyIds = async () => {
  const ids = [];
  const push = (value) => {
    const normalized = normalizeNumber(value);
    if (normalized == null || normalized <= 0) return;
    if (!ids.includes(normalized)) ids.push(normalized);
  };

  const [portalAcademyId, rawPortalAcademyId, lastAcademyId] = await Promise.all([
    typeof storage.getPortalAcademyId === 'function' ? storage.getPortalAcademyId() : null,
    storage.getItem(PORTAL_KEYS.ACADEMY_ID),
    storage.getItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
  ]);

  push(portalAcademyId);
  push(rawPortalAcademyId);
  push(lastAcademyId);
  return ids;
};

const parseFetchPayload = async (response) => {
  const contentType = response.headers?.get?.('content-type') || '';
  const isJson = contentType.includes('application/json');
  if (isJson) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
};

const requestOverviewSnapshot = async ({ token, academyId, playerId }) => {
  const urlBase = String(API_BASE_URL_V1 || '').replace(/\/+$/, '');
  const url = `${urlBase}${PORTAL_OVERVIEW_PATH}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  if (academyId != null) {
    headers['X-Academy-Id'] = String(academyId);
    headers['X-Customer-Id'] = String(academyId);
  }

  const body = buildOverviewRequestBody({ academyId, playerId });
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const payload = await parseFetchPayload(response);
  const tookMs = Date.now() - startedAt;

  logPortalSession('overviewAttempt', {
    url: PORTAL_OVERVIEW_PATH,
    academyId: academyId ?? null,
    playerId: playerId ?? null,
    status: response.status,
    ok: response.ok,
    tookMs,
    tokenPreview: maskToken(token),
    payloadSnippet:
      typeof payload === 'string'
        ? payload.slice(0, 180)
        : payload && typeof payload === 'object'
          ? {
              academy_name: payload?.academy_name || null,
              hasPlayerData: Boolean(payload?.player_data),
              message: payload?.message || payload?.detail || payload?.error || null,
            }
          : null,
  });

  return { ok: response.ok, status: response.status, payload };
};

const requestAuthMeSnapshot = async ({ token }) => {
  const urlBase = String(API_BASE_URL_V1 || '').replace(/\/+$/, '');
  const url = `${urlBase}${PORTAL_AUTH_ME_PATH}`;
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const payload = await parseFetchPayload(response);
  const tookMs = Date.now() - startedAt;
  logPortalSession('authMeAttempt', {
    url: PORTAL_AUTH_ME_PATH,
    status: response.status,
    ok: response.ok,
    tookMs,
    tokenPreview: maskToken(token),
  });
  return { ok: response.ok, status: response.status, payload };
};

export const getPortalAccessToken = (session) =>
  session?.token || session?.access_token || session?.accessToken || null;

export const getPortalAcademyId = (session) => {
  const candidates = [
    session?.user?.academy_id,
    session?.user?.academyId,
    session?.academy_id,
    session?.academyId,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeNumber(candidate);
    if (normalized != null && normalized > 0) return normalized;
  }
  return null;
};

export const getPortalPlayerId = (session) => {
  const candidates = [
    session?.user?.external_player_id,
    session?.user?.externalPlayerId,
    session?.user?.player_id,
    session?.user?.playerId,
    session?.user?.id,
    session?.player_id,
    session?.playerId,
  ];
  for (const candidate of candidates) {
    const normalized = normalizePlayerId(candidate);
    if (normalized != null) return normalized;
  }
  return null;
};

const decodeBase64Url = (value) => {
  if (typeof value !== 'string' || !value) return null;
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);

    if (typeof atob === 'function') {
      return atob(padded);
    }

    if (typeof globalThis?.Buffer !== 'undefined') {
      return globalThis.Buffer.from(padded, 'base64').toString('utf-8');
    }
  } catch {
    return null;
  }
  return null;
};

const decodeJwtPayload = (token) => {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const parseExpiryValue = (value) => {
  if (value == null || value === '') return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric < 1e12 ? numeric * 1000 : numeric;
    }

    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

export const getPortalSessionExpiresAt = (session) => {
  const explicitExpiry = parseExpiryValue(
    session?.expiresAt ||
      session?.expires_at ||
      session?.tokenExpiresAt ||
      session?.token_expires_at ||
      session?.authExpiresAt ||
      session?.auth_expires_at ||
      null
  );

  if (explicitExpiry != null) return explicitExpiry;

  const token = getPortalAccessToken(session);
  const payload = decodeJwtPayload(token);
  const exp = parseExpiryValue(payload?.exp);
  return exp;
};

export const isPortalSessionExpired = (session, now = Date.now()) => {
  const expiresAt = getPortalSessionExpiresAt(session);
  if (expiresAt == null) return false;
  return now >= expiresAt + PORTAL_EXPIRY_GRACE_MS;
};

export const validatePortalSession = (session, options = {}) => {
  const portalSession = options?.portalSession || null;
  const expiresAt = getPortalSessionExpiresAt(session);
  const ttlSec = expiresAt != null ? Math.floor((expiresAt - Date.now()) / 1000) : null;
  const emit = (result) => {
    logPortalSession('validatePortalSession', result);
    if (__DEV__) {
      console.info(
        `[SESSION][CHECK] ok=${result.ok} reason=${sessionReasonCode(result.reason)} ttlSec=${ttlSec ?? 'NA'}`
      );
    }
    return result;
  };

  if (!session) {
    return emit({ ok: false, reason: 'missing_session' });
  }

  const loginAs = toPlayerLoginAs(session.login_as || session.user?.type || session.userType);
  if (loginAs !== 'player') {
    return emit({ ok: false, reason: 'not_player', loginAs });
  }

  const token = getPortalAccessToken(session);
  if (!token) {
    return emit({ ok: false, reason: 'missing_portal_access' });
  }

  const academyId = getPortalAcademyId(session);
  if (!academyId) {
    return emit({ ok: false, reason: 'missing_academy_id' });
  }

  const playerId = getPortalPlayerId(session);
  const tryOutId =
    portalSession?.tryOutId ??
    portalSession?.try_out_id ??
    session?.tryOutId ??
    session?.try_out_id ??
    null;

  if (!playerId && !isValidTryOutId(tryOutId)) {
    return emit({ ok: false, reason: 'missing_player_context' });
  }

  if (isPortalSessionExpired(session)) {
    return emit({
      ok: false,
      reason: 'expired',
      expiresAt,
    });
  }

  return emit({
    ok: true,
    reason: 'ok',
    academyId,
    playerId,
    hasTryOut: isValidTryOutId(tryOutId),
    expiresAt,
  });
};

const persistRefreshedPortalState = async ({
  session,
  existingPortalSession,
  academyId,
  playerId,
  tryOutId,
  token,
}) => {
  const nextSession = {
    ...(session || {}),
    login_as: 'player',
    academyId: academyId ?? session?.academyId ?? null,
    token: token || session?.token || null,
    user: {
      ...(session?.user || {}),
      type: 'player',
      academy_id: academyId ?? session?.user?.academy_id ?? session?.user?.academyId ?? null,
      academyId: academyId ?? session?.user?.academyId ?? session?.user?.academy_id ?? null,
      external_player_id:
        playerId ?? session?.user?.external_player_id ?? session?.user?.externalPlayerId ?? null,
      externalPlayerId:
        playerId ?? session?.user?.externalPlayerId ?? session?.user?.external_player_id ?? null,
    },
  };

  const nextPortalSession = {
    ...(existingPortalSession || {}),
    academyId: academyId ?? existingPortalSession?.academyId ?? null,
    playerId: playerId ?? existingPortalSession?.playerId ?? null,
    tryOutId: isValidTryOutId(tryOutId) ? tryOutId : existingPortalSession?.tryOutId ?? null,
    try_out_id: isValidTryOutId(tryOutId) ? tryOutId : existingPortalSession?.try_out_id ?? null,
    login_as: 'player',
    loginAs: 'player',
    tokenRef: token ? 'auth-session' : existingPortalSession?.tokenRef || null,
    refreshedAt: new Date().toISOString(),
  };

  await storage.setItem(APP_STORAGE_KEYS.AUTH_SESSION, nextSession);
  if (token) {
    await storage.setAuthToken(token).catch((error) => {
      logPortalSession('refreshPortalSessionIfNeeded:setAuthTokenFailed', {
        error: String(error?.message || error),
      });
    });
  }
  if (academyId != null) {
    await Promise.all([
      storage.setPortalAcademyId(academyId),
      storage.setItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID, String(academyId)),
    ]);
  }
  await storage.setPortalSession(nextPortalSession);

  return { nextSession, nextPortalSession };
};

export const refreshPortalSessionIfNeeded = async (sessionOverride) => {
  const session = sessionOverride || (await readAuthSession());
  const existingPortalSession = await readPortalSession();
  const validation = validatePortalSession(session, { portalSession: existingPortalSession });
  const token = getPortalAccessToken(session) || (await resolveAppToken());
  const tokenSession =
    session && typeof session === 'object'
      ? { ...session, token: token || session?.token || null }
      : { login_as: 'player', token: token || null };
  const expiresAt = getPortalSessionExpiresAt(tokenSession);
  const ttlSec = expiresAt != null ? Math.floor((expiresAt - Date.now()) / 1000) : null;

  logPortalSession('refreshPortalSessionIfNeeded:start', {
    needed: !validation.ok,
    reason: validation.reason,
    hasSession: Boolean(session),
    academyId: getPortalAcademyId(session),
    playerId: getPortalPlayerId(session),
    ttlSec,
    hasToken: Boolean(token),
  });
  if (__DEV__) {
    console.info(
      `[SESSION][REHYDRATE] start reason=${sessionReasonCode(validation.reason)} ttlSec=${ttlSec ?? 'NA'}`
    );
  }
  const finalize = (result) => {
    logPortalSession('refreshPortalSessionIfNeeded:end', result);
    if (__DEV__) {
      console.info(
        `[SESSION][REHYDRATE] end success=${result?.success === true} reason=${sessionReasonCode(result?.reason)}`
      );
    }
    return result;
  };

  if (validation.ok) {
    return {
      success: true,
      refreshed: false,
      reason: 'already_valid',
      session,
      portalSession: existingPortalSession,
    };
  }

  if (!token) {
    const result = {
      success: false,
      reason: 'TOKEN_MISSING',
      session,
      portalSession: existingPortalSession,
    };
    return finalize(result);
  }

  if (isPortalSessionExpired(tokenSession)) {
    const result = {
      success: false,
      reason: 'TOKEN_EXPIRED',
      session,
      portalSession: existingPortalSession,
    };
    return finalize(result);
  }

  const attempts = [];
  let knownPlayerId = getPortalPlayerId(session);
  let authMeAcademyId = null;

  if (
    validation.reason === 'missing_session' ||
    validation.reason === 'missing_academy_id' ||
    validation.reason === 'missing_player_context'
  ) {
    const authMeAttempt = await requestAuthMeSnapshot({ token });
    attempts.push({ source: 'auth_me', status: authMeAttempt.status, ok: authMeAttempt.ok });

    if (authMeAttempt.status === 401) {
      const result = {
        success: false,
        reason: 'TOKEN_EXPIRED',
        session,
        portalSession: existingPortalSession,
        attempts,
      };
      return finalize(result);
    }

    if (authMeAttempt.ok && authMeAttempt.payload && typeof authMeAttempt.payload === 'object') {
      authMeAcademyId = pickAcademyIdFromAuthPayload(
        authMeAttempt.payload,
        getPortalAcademyId(session)
      );
      knownPlayerId = pickPlayerIdFromAuthPayload(authMeAttempt.payload, knownPlayerId);

      if (authMeAcademyId && knownPlayerId) {
        const { nextSession, nextPortalSession } = await persistRefreshedPortalState({
          session,
          existingPortalSession,
          academyId: authMeAcademyId,
          playerId: knownPlayerId,
          tryOutId:
            existingPortalSession?.tryOutId ??
            existingPortalSession?.try_out_id ??
            session?.tryOutId ??
            session?.try_out_id ??
            null,
          token,
        });
        const result = {
          success: true,
          refreshed: true,
          reason: 'rehydrated_from_auth_me',
          session: nextSession,
          portalSession: nextPortalSession,
          attempts,
        };
        return finalize(result);
      }
    }
  }

  const candidateAcademyIds = [
    getPortalAcademyId(session),
    authMeAcademyId,
    existingPortalSession?.academyId,
    ...(await readStoredAcademyIds()),
  ].filter((value, index, arr) => {
    const normalized = normalizeNumber(value);
    return normalized != null && normalized > 0 && arr.findIndex((x) => Number(x) === normalized) === index;
  });

  const academyAttempts = candidateAcademyIds.length ? candidateAcademyIds : [null];
  for (const academyId of academyAttempts) {
    const attempt = await requestOverviewSnapshot({ token, academyId, playerId: knownPlayerId });
    attempts.push({ source: 'overview', academyId, status: attempt.status, ok: attempt.ok });

    if (!attempt.ok) {
      if (attempt.status === 401) {
        const result = {
          success: false,
          reason: 'TOKEN_EXPIRED',
          session,
          portalSession: existingPortalSession,
          attempts,
        };
        return finalize(result);
      }
      continue;
    }

    const payload = attempt.payload && typeof attempt.payload === 'object' ? attempt.payload : null;
    const resolvedAcademyId = pickAcademyIdFromOverview(payload, academyId);
    const resolvedPlayerId = pickPlayerIdFromOverview(payload, knownPlayerId);
    const tryOutId = extractTryOutIdFromOverview(payload);

    if (!resolvedAcademyId || !resolvedPlayerId) {
      continue;
    }

    const { nextSession, nextPortalSession } = await persistRefreshedPortalState({
      session,
      existingPortalSession,
      academyId: resolvedAcademyId,
      playerId: resolvedPlayerId,
      tryOutId,
      token,
    });

    const result = {
      success: true,
      refreshed: true,
      reason: 'rehydrated_from_overview',
      session: nextSession,
      portalSession: nextPortalSession,
      attempts,
    };
    return finalize(result);
  }

  const fallbackAcademyId = candidateAcademyIds[0] || authMeAcademyId || null;
  const fallbackPlayerId = knownPlayerId;

  if (fallbackAcademyId && fallbackPlayerId) {
    const { nextSession, nextPortalSession } = await persistRefreshedPortalState({
      session,
      existingPortalSession,
      academyId: fallbackAcademyId,
      playerId: fallbackPlayerId,
      tryOutId:
        existingPortalSession?.tryOutId ??
        existingPortalSession?.try_out_id ??
        session?.tryOutId ??
        session?.try_out_id ??
        null,
      token,
    });

    const fallbackResult = {
      success: true,
      refreshed: true,
      reason: 'rehydrated_from_storage',
      session: nextSession,
      portalSession: nextPortalSession,
      attempts,
    };
    return finalize(fallbackResult);
  }

  const result = {
    success: false,
    reason: sessionReasonCode(validation.reason || 'portal_rehydrate_failed'),
    session,
    portalSession: existingPortalSession,
    attempts,
  };
  return finalize(result);
};
