export const STORAGE_KEYS = {
  PUBLIC_USER_MODE: 'sporhive_public_user_mode',
  PUBLIC_USER: 'sporhive_public_user',
  PLAYGROUNDS_CLIENT: 'sporhive_playgrounds_client',
  BOOKING_DRAFT: 'sporhive_playgrounds_booking_draft',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
