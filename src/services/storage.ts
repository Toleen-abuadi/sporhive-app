import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  PUBLIC_USER_MODE: 'sporhive_public_user_mode',
  PUBLIC_USER: 'sporhive_public_user',
  PLAYGROUNDS_CLIENT: 'sporhive_playgrounds_client',
  BOOKING_DRAFT: 'sporhive_playgrounds_booking_draft',
} as const;

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
