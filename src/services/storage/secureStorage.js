import * as SecureStore from 'expo-secure-store';

const memoryStore = new Map();
const hasSecureStore =
  SecureStore &&
  typeof SecureStore.getItemAsync === 'function' &&
  typeof SecureStore.setItemAsync === 'function' &&
  typeof SecureStore.deleteItemAsync === 'function';

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

const getKey = (key) => {
  if (key == null) return null;
  return String(key);
};

export const secureStorage = {
  isAvailable: () => hasSecureStore,
  async getItem(key) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) return null;
    try {
      if (hasSecureStore) {
        const raw = await SecureStore.getItemAsync(resolvedKey);
        return parseStoredValue(raw);
      }
      return parseStoredValue(memoryStore.get(resolvedKey));
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) return;
    const serialized = serializeValue(value);
    try {
      if (hasSecureStore) {
        await SecureStore.setItemAsync(resolvedKey, serialized);
        return;
      }
      memoryStore.set(resolvedKey, serialized);
    } catch {
      return;
    }
  },
  async removeItem(key) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) return;
    try {
      if (hasSecureStore) {
        await SecureStore.deleteItemAsync(resolvedKey);
        return;
      }
      memoryStore.delete(resolvedKey);
    } catch {
      return;
    }
  },
  async removeItems(keys = []) {
    await Promise.all(keys.map((key) => secureStorage.removeItem(key)));
  },
};
