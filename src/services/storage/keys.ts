export const STORAGE_KEYS = {
  PUBLIC_USER_MODE: 'public_user_mode',
  PUBLIC_USER: 'public_user',
  BOOKING_DRAFT: 'booking_draft',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
