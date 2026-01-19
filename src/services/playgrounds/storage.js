import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/keys';

export async function getPublicUserMode() {
  const mode = await storage.getItem(STORAGE_KEYS.PUBLIC_USER_MODE);
  return mode === 'guest' || mode === 'registered' ? mode : null;
}

export async function setPublicUserMode(mode) {
  if (!mode) {
    await storage.removeItem(STORAGE_KEYS.PUBLIC_USER_MODE);
    return;
  }
  await storage.setItem(STORAGE_KEYS.PUBLIC_USER_MODE, mode);
}

export async function getPublicUser() {
  const user = await storage.getItem(STORAGE_KEYS.PUBLIC_USER);
  return user && typeof user === 'object' ? user : null;
}

export async function setPublicUser(user) {
  if (!user) {
    await storage.removeItem(STORAGE_KEYS.PUBLIC_USER);
    return;
  }
  await storage.setItem(STORAGE_KEYS.PUBLIC_USER, user);
}

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
