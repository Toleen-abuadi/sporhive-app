import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import LogRocket from '@logrocket/react-native';

// SecureStore is unavailable on some runtimes (notably web/some shells).
// We prefer durable fallback storage when possible before falling back to memory.
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

const hasLocalStorage =
  typeof window !== 'undefined' &&
  window?.localStorage &&
  typeof window.localStorage.getItem === 'function' &&
  typeof window.localStorage.setItem === 'function' &&
  typeof window.localStorage.removeItem === 'function';

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

const getKey = (key) => {
  if (key == null) return null;
  return String(key);
};

let warnedMemoryFallback = false;

const captureStorageException = (error, context) => {
  if (typeof LogRocket?.captureException !== 'function') return;
  try {
    LogRocket.captureException(error, { extra: context });
  } catch {
    // Ignore LogRocket capture failures.
  }
};

const logSecureStorageError = (action, key, error) => {
  if (__DEV__) {
    console.warn(`[secureStorage] ${action} failed`, {
      key,
      error: String(error?.message || error),
    });
  }
  captureStorageException(error, { scope: 'secureStorage', action, key });
};

const warnMemoryFallbackOnce = () => {
  if (warnedMemoryFallback) return;
  warnedMemoryFallback = true;

  if (__DEV__) {
    console.warn(
      '[secureStorage] Durable storage unavailable. Falling back to memory-only storage; tokens will be cleared on restart.'
    );
  }
};

const resolveFallbackAdapter = () => {
  if (hasAsyncStorage) return AsyncStorage;
  if (Platform.OS === 'web' && hasLocalStorage) return localStorageAdapter;
  return null;
};

export const secureStorage = {
  // Durable availability (memory fallback is intentionally excluded).
  isAvailable: () =>
    hasSecureStore ||
    hasAsyncStorage ||
    (Platform.OS === 'web' && hasLocalStorage),

  async getItem(key) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) return null;

    try {
      if (hasSecureStore) {
        const raw = await SecureStore.getItemAsync(resolvedKey);
        const parsed = parseStoredValue(raw);
        if (parsed != null) return parsed;
      }

      const fallbackAdapter = resolveFallbackAdapter();
      if (fallbackAdapter) {
        const raw = await fallbackAdapter.getItem(resolvedKey);
        return parseStoredValue(raw);
      }

      warnMemoryFallbackOnce();
      return memoryStore.has(resolvedKey) ? memoryStore.get(resolvedKey) : null;
    } catch (error) {
      logSecureStorageError('getItem', resolvedKey, error);
      return null;
    }
  },

  async setItem(key, value, options = {}) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) {
      if (options?.critical) throw new Error('SECURE_STORAGE_INVALID_KEY');
      return;
    }

    const serialized = serializeValue(value);

    try {
      if (hasSecureStore) {
        await SecureStore.setItemAsync(resolvedKey, serialized);

        // Keep durable backup in AsyncStorage when available.
        if (hasAsyncStorage) {
          await AsyncStorage.setItem(resolvedKey, serialized);
        }
        return;
      }

      const fallbackAdapter = resolveFallbackAdapter();
      if (fallbackAdapter) {
        await fallbackAdapter.setItem(resolvedKey, serialized);
        return;
      }

      warnMemoryFallbackOnce();
      memoryStore.set(resolvedKey, parseStoredValue(serialized));
    } catch (error) {
      logSecureStorageError('setItem', resolvedKey, error);
      if (options?.critical) {
        throw error;
      }
    }
  },

  async removeItem(key, options = {}) {
    const resolvedKey = getKey(key);
    if (!resolvedKey) {
      if (options?.critical) throw new Error('SECURE_STORAGE_INVALID_KEY');
      return;
    }

    try {
      if (hasSecureStore) {
        await SecureStore.deleteItemAsync(resolvedKey);

        if (hasAsyncStorage) {
          await AsyncStorage.removeItem(resolvedKey);
        }
        return;
      }

      const fallbackAdapter = resolveFallbackAdapter();
      if (fallbackAdapter) {
        await fallbackAdapter.removeItem(resolvedKey);
        return;
      }

      warnMemoryFallbackOnce();
      memoryStore.delete(resolvedKey);
    } catch (error) {
      logSecureStorageError('removeItem', resolvedKey, error);
      if (options?.critical) {
        throw error;
      }
    }
  },

  async removeItems(keys = []) {
    await Promise.all(keys.map((key) => secureStorage.removeItem(key)));
  },
};

