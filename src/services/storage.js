import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  PUBLIC_USER_MODE: 'sporhive_public_user_mode',
  PUBLIC_USER: 'sporhive_public_user',
  PLAYGROUNDS_CLIENT: 'sporhive_playgrounds_client',
  BOOKING_DRAFT: 'sporhive_playgrounds_booking_draft',
};

export async function getJSON(key) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function remove(key) {
  await AsyncStorage.removeItem(key);
}
