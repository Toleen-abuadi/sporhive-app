import { storage, APP_STORAGE_KEYS, PORTAL_KEYS } from '../storage/storage';
import { getPortalAcademyId } from '../auth/portalSession';
import { resolveAppToken } from './appHeaders';

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
  const token = await resolveAppToken();
  if (!token) {
    // NOTE: this uses the app token resolver (single-token policy).
    throw createPortalError('Missing app token', {
      code: 'PORTAL_TOKEN_MISSING',
      kind: 'PORTAL_AUTH_REQUIRED',
    });
  }

  const academyId = await resolvePortalAcademyId(options);
  if (!Number.isInteger(academyId) || academyId <= 0) {
    const err = createPortalError('Missing portal academy id', {
      code: 'PORTAL_ACADEMY_MISSING',
      kind: 'PORTAL_ACADEMY_REQUIRED',
    });
    if (__DEV__) {
      console.log('[portalHeaders] academyId:', academyId);
    }
    throw err;
  }

  return {
    Authorization: `Bearer ${token}`,
    'X-Academy-Id': String(academyId),
    'X-Customer-Id': String(academyId),
  };
};
