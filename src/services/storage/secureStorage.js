import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// NOTE:
// SecureStore isn't available on some runtimes (notably web, some dev shells).
// If we fall back to an in-memory Map, auth tokens will be lost on app restart.
// Use AsyncStorage as a durable fallback when SecureStore is unavailable.
const memoryStore = new Map();

const hasSecureStore =
  SecureStore &&
  typeof SecureStore.getItemAsync === 'function' &&
  typeof SecureStore.setItemAsync === 'function' &&
  typeof SecureStore.deleteItemAsync === 'function';

const hasAsyncStorage =
  AsyncStorage &&
  typeof AsyncStorage.getItem === 'function' &&
  typeof AsyncStorage.setItem === 'function' &&
  typeof AsyncStorage.removeItem === 'function';

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
  // ✅ consider storage "available" if either SecureStore OR AsyncStorage is available
  isAvailable: () => hasSecureStore || hasAsyncStorage,

  // ✅ durable read: SecureStore -> AsyncStorage -> null (no memory fallback)
  async getItem(key) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) return null;

    try {
      if (hasSecureStore) {
        const raw = await SecureStore.getItemAsync(resolvedKey);
        const parsed = parseStoredValue(raw);
        if (parsed != null) return parsed;
      }

      if (hasAsyncStorage) {
        const raw = await AsyncStorage.getItem(resolvedKey);
        return parseStoredValue(raw);
      }

      return null; // ❌ DO NOT use memoryStore
    } catch {
      return null;
    }
  },

  // ✅ durable write: SecureStore (and AsyncStorage backup) -> AsyncStorage -> noop
  async setItem(key, value) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) return;

    const serialized = serializeValue(value);

    try {
      if (hasSecureStore) {
        await SecureStore.setItemAsync(resolvedKey, serialized);

        // Optional backup: keep a durable copy in AsyncStorage too
        if (hasAsyncStorage) {
          await AsyncStorage.setItem(resolvedKey, serialized);
        }
        return;
      }

      if (hasAsyncStorage) {
        await AsyncStorage.setItem(resolvedKey, serialized);
        return;
      }

      // ❌ do nothing instead of memory fallback
    } catch {
      return;
    }
  },

  // ✅ durable delete: SecureStore (and AsyncStorage backup) -> AsyncStorage -> noop
  async removeItem(key) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) return;

    try {
      if (hasSecureStore) {
        await SecureStore.deleteItemAsync(resolvedKey);

        // keep stores consistent if we wrote a backup
        if (hasAsyncStorage) {
          await AsyncStorage.removeItem(resolvedKey);
        }
        return;
      }

      if (hasAsyncStorage) {
        await AsyncStorage.removeItem(resolvedKey);
        return;
      }

      // ❌ do nothing instead of memory fallback
      // memoryStore.delete(resolvedKey);
    } catch {
      return;
    }
  },

  async removeItems(keys = []) {
    await Promise.all(keys.map((key) => secureStorage.removeItem(key)));
  },
};
