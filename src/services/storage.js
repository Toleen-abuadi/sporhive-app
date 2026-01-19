import { storage } from './storage/storage';
import { STORAGE_KEYS } from './storage/keys';

export { STORAGE_KEYS };

export async function getJSON(key) {
  const raw = await storage.getItem(key);
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setJSON(key, value) {
  await storage.setItem(key, value);
}

export async function remove(key) {
  await storage.removeItem(key);
}
