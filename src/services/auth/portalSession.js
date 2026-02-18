import { storage, APP_STORAGE_KEYS } from '../storage/storage';

export const getPortalAccessToken = (session) => session?.token || null;

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
  return now >= expiresAt;
};

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

  const token = getPortalAccessToken(session);
  if (!token) {
    return { ok: false, reason: 'missing_portal_access' };
  }

  if (isPortalSessionExpired(session)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true };
};

/**
 * Single-token policy: no separate portal refresh.
 * We only validate the existing auth session.
 */
export const refreshPortalSessionIfNeeded = async (sessionOverride) => {
  const session = sessionOverride || (await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION));
  const validation = validatePortalSession(session);
  if (validation.ok) {
    return { success: true, session };
  }
  return { success: false, reason: validation.reason, session };
};
