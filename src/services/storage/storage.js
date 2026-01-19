import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJson(key) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key) {
  await AsyncStorage.removeItem(key);
}
