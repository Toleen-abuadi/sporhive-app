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
