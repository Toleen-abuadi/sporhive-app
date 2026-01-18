import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/keys';

export type PublicUserMode = 'guest' | 'registered';

export type PlaygroundsClientState = {
  filters?: Record<string, string | number | boolean | null | undefined>;
  cachedAt?: string;
  cachedResults?: unknown[];
};

export async function getPublicUserMode(): Promise<PublicUserMode | null> {
  const mode = await storage.getItem(STORAGE_KEYS.PUBLIC_USER_MODE);
  return mode === 'guest' || mode === 'registered' ? mode : null;
}

export async function setPublicUserMode(mode: PublicUserMode | null): Promise<void> {
  if (!mode) {
    await storage.removeItem(STORAGE_KEYS.PUBLIC_USER_MODE);
    return;
  }
  await storage.setItem(STORAGE_KEYS.PUBLIC_USER_MODE, mode);
}

export async function getPublicUser<T>(): Promise<T | null> {
  const user = await storage.getItem(STORAGE_KEYS.PUBLIC_USER);
  return user && typeof user === 'object' ? (user as T) : null;
}

export async function setPublicUser<T>(user: T | null): Promise<void> {
  if (!user) {
    await storage.removeItem(STORAGE_KEYS.PUBLIC_USER);
    return;
  }
  await storage.setItem(STORAGE_KEYS.PUBLIC_USER, user);
}

export async function getPlaygroundsClientState(): Promise<PlaygroundsClientState | null> {
  const state = await storage.getItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT);
  return state && typeof state === 'object' ? (state as PlaygroundsClientState) : null;
}

export async function setPlaygroundsClientState(state: PlaygroundsClientState | null): Promise<void> {
  if (!state) {
    await storage.removeItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT);
    return;
  }
  await storage.setItem(STORAGE_KEYS.PLAYGROUNDS_CLIENT, state);
}

export async function getBookingDraft<T>(): Promise<T | null> {
  const draft = await storage.getItem(STORAGE_KEYS.BOOKING_DRAFT);
  return draft && typeof draft === 'object' ? (draft as T) : null;
}

export async function setBookingDraft<T>(draft: T | null): Promise<void> {
  if (!draft) {
    await storage.removeItem(STORAGE_KEYS.BOOKING_DRAFT);
    return;
  }
  await storage.setItem(STORAGE_KEYS.BOOKING_DRAFT, draft);
}
