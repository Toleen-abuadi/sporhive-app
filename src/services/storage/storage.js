import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';
import { STORAGE_KEYS } from './keys';

const memoryStore = new Map();

export const APP_STORAGE_KEYS = {
  THEME: 'sporhive_theme',
  LANGUAGE: 'sporhive_language',
  AUTH_TOKEN: 'sporhive_auth_token',
  AUTH_SESSION: 'sporhive_auth_session',
  LAST_ACADEMY_ID: 'sporhive_last_academy_id',
  WELCOME_SEEN: 'sporhive_welcome_seen',
};

const LEGACY_AUTH_TOKEN_KEYS = ['token', 'access', 'authToken', 'access_token', 'tokens'];

export const PORTAL_KEYS = {
  ACADEMY_ID: 'sporhive_portal_academy_id',
  AUTH_TOKENS: 'sporhive_portal_auth_tokens',
  SESSION: 'sporhive_portal_session',
};

const LEGACY_PORTAL_CREDENTIAL_KEYS = ['sporhive_portal_username', 'sporhive_portal_password'];

const hasAsyncStorage =
  AsyncStorage &&
  typeof AsyncStorage.getItem === 'function' &&
  typeof AsyncStorage.setItem === 'function' &&
  typeof AsyncStorage.removeItem === 'function';

const hasLocalStorage =
  typeof window !== 'undefined' &&
  window?.localStorage &&
  typeof window.localStorage.getItem === 'function';

const memoryAdapter = {
  async getItem(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async setItem(key, value) {
    memoryStore.set(key, value);
  },
  async removeItem(key) {
    memoryStore.delete(key);
  },
  async multiGet(keys) {
    return keys.map((key) => [key, memoryStore.has(key) ? memoryStore.get(key) : null]);
  },
  async multiSet(pairs) {
    pairs.forEach(([key, value]) => {
      memoryStore.set(key, value);
    });
  },
};

const localStorageAdapter = {
  async getItem(key) {
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    window.localStorage.removeItem(key);
  },
  async multiGet(keys) {
    return keys.map((key) => [key, window.localStorage.getItem(key)]);
  },
  async multiSet(pairs) {
    pairs.forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
  },
};

const resolveAdapter = () => {
  if (hasAsyncStorage) return AsyncStorage;
  if (hasLocalStorage) return localStorageAdapter;
  return memoryAdapter;
};

const parseStoredValue = (raw) => {
  if (raw == null) return null;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const serializeValue = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

let secureMigrationPromise;

const migrateSensitiveStorage = async () => {
  if (secureMigrationPromise) {
    return secureMigrationPromise;
  }

  secureMigrationPromise = (async () => {
    const adapter = resolveAdapter();
    if (!adapter?.getItem || !adapter?.removeItem) return;

    const secureAvailable = secureStorage.isAvailable();
    const [existingAuthToken, existingPortalTokens] = await Promise.all([
      secureStorage.getItem(APP_STORAGE_KEYS.AUTH_TOKEN),
      secureStorage.getItem(PORTAL_KEYS.AUTH_TOKENS),
    ]);

    const legacyTokenValues = await Promise.all(
      LEGACY_AUTH_TOKEN_KEYS.map((key) => adapter.getItem(key))
    );
    const legacyToken = legacyTokenValues
      .map((value) => parseStoredValue(value))
      .find((value) => typeof value === 'string' && value.length > 0);

    if (secureAvailable && !existingAuthToken && legacyToken) {
      await secureStorage.setItem(APP_STORAGE_KEYS.AUTH_TOKEN, legacyToken);
    }

    const legacyPortalTokensRaw = await adapter.getItem(PORTAL_KEYS.AUTH_TOKENS);
    const legacyPortalTokens = parseStoredValue(legacyPortalTokensRaw);

    if (secureAvailable && !existingPortalTokens && legacyPortalTokens) {
      await secureStorage.setItem(PORTAL_KEYS.AUTH_TOKENS, legacyPortalTokens);
    }

    const legacySessionRaw = await adapter.getItem(APP_STORAGE_KEYS.AUTH_SESSION);
    const legacySession = parseStoredValue(legacySessionRaw);

    if (legacySession && typeof legacySession === 'object') {
      const { portal_tokens, portalAccessToken, ...rest } = legacySession;
      if (portal_tokens && secureAvailable && !existingPortalTokens) {
        await secureStorage.setItem(PORTAL_KEYS.AUTH_TOKENS, portal_tokens);
      }
      if (secureAvailable && (portal_tokens || portalAccessToken)) {
        const sanitized = { ...rest };
        await adapter.setItem(APP_STORAGE_KEYS.AUTH_SESSION, serializeValue(sanitized));
      }
    }

    if (secureAvailable) {
      await Promise.all(
        [PORTAL_KEYS.AUTH_TOKENS, ...LEGACY_AUTH_TOKEN_KEYS].map((key) => adapter.removeItem(key))
      );
    }

    await Promise.all(LEGACY_PORTAL_CREDENTIAL_KEYS.map((key) => adapter.removeItem(key)));
  })();

  return secureMigrationPromise;
};

export const storage = {
  async ensureSecureMigration() {
    await migrateSensitiveStorage();
  },
  async getItem(key) {
    try {
      const adapter = resolveAdapter();
      const raw = await adapter.getItem(key);
      return parseStoredValue(raw);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      const adapter = resolveAdapter();
      const serialized = serializeValue(value);
      await adapter.setItem(key, serialized);
    } catch {
      return;
    }
  },
  async removeItem(key) {
    try {
      const adapter = resolveAdapter();
      await adapter.removeItem(key);
    } catch {
      return;
    }
  },
  async multiGet(keys) {
    try {
      const adapter = resolveAdapter();
      if (adapter.multiGet) {
        const results = await adapter.multiGet(keys);
        return results.map(([key, value]) => [key, parseStoredValue(value)]);
      }
      const values = await Promise.all(keys.map((key) => adapter.getItem(key)));
      return keys.map((key, index) => [key, parseStoredValue(values[index])]);
    } catch {
      return [];
    }
  },
  async multiSet(pairs) {
    try {
      const adapter = resolveAdapter();
      const serializedPairs = pairs.map(([key, value]) => [key, serializeValue(value)]);
      if (adapter.multiSet) {
        await adapter.multiSet(serializedPairs);
        return;
      }
      await Promise.all(serializedPairs.map(([key, value]) => adapter.setItem(key, value)));
    } catch {
      return;
    }
  },
  async getAuthToken() {
    const token = await secureStorage.getItem(APP_STORAGE_KEYS.AUTH_TOKEN);
    return typeof token === 'string' ? token : null;
  },
  async setAuthToken(token) {
    await secureStorage.setItem(APP_STORAGE_KEYS.AUTH_TOKEN, token);
  },
  async removeAuthToken() {
    await secureStorage.removeItem(APP_STORAGE_KEYS.AUTH_TOKEN);
  },
  async getPortalTokens() {
    const tokens = await secureStorage.getItem(PORTAL_KEYS.AUTH_TOKENS);
    return tokens && typeof tokens === 'object' ? tokens : null;
  },
  async setPortalTokens(tokens) {
    if (!tokens) return;
    await secureStorage.setItem(PORTAL_KEYS.AUTH_TOKENS, tokens);
  },
  async removePortalTokens() {
    await secureStorage.removeItem(PORTAL_KEYS.AUTH_TOKENS);
  },
  async getLegacyAuthToken() {
    const entries = await storage.multiGet(LEGACY_AUTH_TOKEN_KEYS);
    for (const [, value] of entries) {
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    return null;
  },
  async removeLegacyAuthTokens() {
    await Promise.all(LEGACY_AUTH_TOKEN_KEYS.map((key) => storage.removeItem(key)));
  },
  async removeLegacyPortalCredentials() {
    await Promise.all(LEGACY_PORTAL_CREDENTIAL_KEYS.map((key) => storage.removeItem(key)));
  },
  async setPortalSession(session) {
    await storage.setItem(PORTAL_KEYS.SESSION, session);
  },
  async getPortalSession() {
    const session = await storage.getItem(PORTAL_KEYS.SESSION);
    return session && typeof session === 'object' ? session : null;
  },
  async setPortalAcademyId(id) {
    const value = id == null ? null : String(id);
    await storage.setItem(PORTAL_KEYS.ACADEMY_ID, value);
  },
  async logoutPortal() {
    await Promise.all([
      storage.removePortalTokens(),
      storage.removeItem(PORTAL_KEYS.AUTH_TOKENS),
      storage.removeItem(PORTAL_KEYS.SESSION),
      storage.removeItem(PORTAL_KEYS.ACADEMY_ID),
      storage.removeLegacyPortalCredentials(),
    ]);
  },
  async clearTenantState() {
    await Promise.all([
      storage.removeItem(APP_STORAGE_KEYS.LAST_ACADEMY_ID),
      storage.removeItem(PORTAL_KEYS.ACADEMY_ID),
      storage.removeItem(STORAGE_KEYS.PLAYGROUNDS_FILTERS),
      storage.removeItem(STORAGE_KEYS.BOOKING_DRAFT),
      storage.removeItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT),
      storage.removeItem(STORAGE_KEYS.ACADEMY_DISCOVERY_STATE),
    ]);
  },
};

export function safeJsonParse(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
