import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/keys';

export async function getAcademyDiscoveryState() {
  const state = await storage.getItem(STORAGE_KEYS.ACADEMY_DISCOVERY_STATE);
  return state && typeof state === 'object' ? state : null;
}

export async function setAcademyDiscoveryState(state) {
  if (!state) {
    await storage.removeItem(STORAGE_KEYS.ACADEMY_DISCOVERY_STATE);
    return;
  }
  await storage.setItem(STORAGE_KEYS.ACADEMY_DISCOVERY_STATE, state);
}
