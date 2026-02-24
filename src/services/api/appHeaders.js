// src/services/api/appHeaders.js
import { storage, APP_STORAGE_KEYS } from '../storage/storage';

const readAuthSession = async () => {
  const session = await storage.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
  return session && typeof session === 'object' ? session : null;
};

const extractAppToken = (session) => {
  return (
    session?.access_token ||
    session?.accessToken ||
    session?.token ||
    session?.public_token ||
    session?.publicToken ||
    null
  );
};

export const resolveAppToken = async () => {
  const storedToken = storage.getAuthToken ? await storage.getAuthToken() : null;
  if (storedToken) return storedToken;

  const session = await readAuthSession();
  return extractAppToken(session);
};

/**
 * Central place to build ALL app/public auth headers.
 * Nothing else should manually assemble:
 *   Authorization: 'Bearer ' + token
 */
export async function getAppAuthHeaders(options = {}) {
  const { allowMissingToken = false } = options;
  const token = await resolveAppToken();

  if (!token) {
    if (allowMissingToken) {
      return {};
    }
    const err = new Error('Missing app/public token');
    err.code = 'APP_TOKEN_MISSING';
    err.kind = 'AUTH_REQUIRED';
    throw err;
  }

  return { Authorization: `Bearer ${token}` };
}
