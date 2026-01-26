import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/keys';

export async function getPlaygroundsClientState() {
  const state = await storage.getItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT);
  return state && typeof state === 'object' ? state : null;
}

export async function setPlaygroundsClientState(state) {
  if (!state) {
    await storage.removeItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT);
    return;
  }
  await storage.setItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT, state);
}

export async function getBookingDraft() {
  const draft = await storage.getItem(STORAGE_KEYS.BOOKING_DRAFT);
  return draft && typeof draft === 'object' ? draft : null;
}

export async function setBookingDraft(draft) {
  if (!draft) {
    await storage.removeItem(STORAGE_KEYS.BOOKING_DRAFT);
    return;
  }
  await storage.setItem(STORAGE_KEYS.BOOKING_DRAFT, draft);
}

export async function getPlaygroundsFilters() {
  const filters = await storage.getItem(STORAGE_KEYS.PLAYGROUNDS_FILTERS);
  return filters && typeof filters === 'object' ? filters : null;
}

export async function setPlaygroundsFilters(filters) {
  if (!filters) {
    await storage.removeItem(STORAGE_KEYS.PLAYGROUNDS_FILTERS);
    return;
  }
  await storage.setItem(STORAGE_KEYS.PLAYGROUNDS_FILTERS, filters);
}

export async function clearPlaygroundsAuth() {
  await Promise.all([
    storage.removeItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT),
    storage.removeItem(STORAGE_KEYS.BOOKING_DRAFT),
    storage.removeItem(STORAGE_KEYS.PLAYGROUNDS_FILTERS),
  ]);
}
