import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map();

export const APP_STORAGE_KEYS = {
  THEME: 'sporhive_theme',
  LANGUAGE: 'sporhive_language',
  AUTH_TOKEN: 'sporhive_auth_token',
  WELCOME_SEEN: 'sporhive_welcome_seen',
};

export const PORTAL_KEYS = {
  ACADEMY_ID: 'sporhive_portal_academy_id',
  USERNAME: 'sporhive_portal_username',
  PASSWORD: 'sporhive_portal_password',
  AUTH_TOKENS: 'sporhive_portal_auth_tokens',
  SESSION: 'sporhive_portal_session',
};

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

export const storage = {
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
    const token = await storage.getItem(APP_STORAGE_KEYS.AUTH_TOKEN);
    return typeof token === 'string' ? token : null;
  },
  async setAuthToken(token) {
    await storage.setItem(APP_STORAGE_KEYS.AUTH_TOKEN, token);
  },
  async removeAuthToken() {
    await storage.removeItem(APP_STORAGE_KEYS.AUTH_TOKEN);
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
