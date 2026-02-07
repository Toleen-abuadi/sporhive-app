import { storage, APP_STORAGE_KEYS, PORTAL_KEYS } from '../storage/storage';
import { getPortalAcademyId } from '../auth/portalSession';
import { resolveAppToken } from './appHeaders';

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  return session && typeof session === 'object' ? session : null;
};

const normalizeAcademyId = (value) => {
  if (value == null) return null;
  const numeric = Number(value);
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
    const err = new Error('Missing portal token');
    err.code = 'PORTAL_TOKEN_MISSING';
    err.kind = 'PORTAL_AUTH_REQUIRED';
    throw err;
  }

  const academyId = await resolvePortalAcademyId(options);
  if (!academyId) {
    const err = new Error('Missing portal academy id');
    err.code = 'PORTAL_ACADEMY_MISSING';
    err.kind = 'PORTAL_ACADEMY_REQUIRED';
    throw err;
  }

  return {
    Authorization: `Bearer ${token}`,
    'X-Academy-Id': String(academyId),
    'X-Customer-Id': String(academyId),
  };
};
