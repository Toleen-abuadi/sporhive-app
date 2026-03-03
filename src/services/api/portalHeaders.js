import { storage, APP_STORAGE_KEYS, PORTAL_KEYS } from '../storage/storage';
import { getPortalAcademyId, getPortalPlayerId } from '../auth/portalSession';
import { resolveAppToken } from './appHeaders';

const DEBUG_PORTAL_HEADERS = true;

const maskToken = (token) => {
  if (!token) return null;
  const value = String(token);
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
};

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  return session && typeof session === 'object' ? session : null;
};

const normalizeAcademyId = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === '') return null;
  const numeric = Number(s);
  return Number.isFinite(numeric) ? numeric : null;
};

const readStoredAcademyId = async () => {
  if (storage.getPortalAcademyId) {
    const id = await storage.getPortalAcademyId();
    if (id != null) return normalizeAcademyId(id);
  }
  const stored = await storage.getItem(PORTAL_KEYS.ACADEMY_ID);
  if (stored != null) return normalizeAcademyId(stored);
  const lastAcademy = await storage.getItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID);
  if (lastAcademy != null) return normalizeAcademyId(lastAcademy);
  return null;
};

export const resolvePortalAcademyId = async (options = {}) => {
  if (options.academyId != null) return normalizeAcademyId(options.academyId);
  const session = options.session || (await readAuthSession());
  const sessionAcademy = getPortalAcademyId(session);
  if (sessionAcademy != null) return normalizeAcademyId(sessionAcademy);
  return readStoredAcademyId();
};

// Structured portal error helpers (prevents blank screens when callers surface `err.kind`).
export const createPortalError = (message, { code, kind }) => {
  const err = new Error(message);
  err.code = code;
  err.kind = kind;
 // Consistent fields for UI gates / API layers
  err.isPortalError = true;
  err.recoverable = true;
  return err;
};

export const isPortalError = (err) =>
  Boolean(err && (err.isPortalError || err.kind?.startsWith('PORTAL_')));


/**
 * Central place to build ALL portal auth headers.
 * Portal calls must include:
 * - Authorization
 * - X-Academy-Id
 * - X-Customer-Id
 */
export const getPortalAuthHeaders = async (options = {}) => {
  const session = options.session || (await readAuthSession());
  const token = await resolveAppToken();
  if (!token) {
    if (DEBUG_PORTAL_HEADERS) {
      console.warn('[portalHeaders] token missing', {
        hasSession: Boolean(session),
        loginAs: session?.login_as || session?.user?.type || null,
      });
    }
    // NOTE: this uses the app token resolver (single-token policy).
    throw createPortalError('Missing app token', {
      code: 'PORTAL_TOKEN_MISSING',
      kind: 'PORTAL_AUTH_REQUIRED',
    });
  }

  const academyId = await resolvePortalAcademyId({ ...options, session });
  const playerId = getPortalPlayerId(session);
  const loginAs = session?.login_as || session?.user?.type || 'player';

  if (!Number.isInteger(academyId) || academyId <= 0) {
    if (DEBUG_PORTAL_HEADERS) {
      console.warn('[portalHeaders] Missing academyId', {
        academyId,
        playerId: playerId ?? null,
        loginAs,
        tokenPreview: maskToken(token),
        optionsAcademyId: options?.academyId ?? null,
      });
    }
    const err = createPortalError('Missing portal academy id', {
      code: 'PORTAL_ACADEMY_MISSING',
      kind: 'PORTAL_ACADEMY_REQUIRED',
    });
    throw err;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Academy-Id': String(academyId),
    'X-Customer-Id': String(academyId),
  };

  if (playerId != null) {
    headers['X-Player-Id'] = String(playerId);
  }
  if (loginAs) {
    headers['X-Login-As'] = String(loginAs);
  }

  if (DEBUG_PORTAL_HEADERS) {
    console.info('[portalHeaders] resolved', {
      academyId,
      playerId: playerId ?? null,
      loginAs,
      tokenPreview: maskToken(token),
    });
  }

  return headers;
};
