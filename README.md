sporhive-app

## Secure Storage Fallback (Web)

- On web, when `expo-secure-store` is unavailable, the app now prefers durable fallback storage (`AsyncStorage`, then browser `localStorage` when available).
- If no durable storage is available, it falls back to in-memory storage and logs a one-time development warning.
- In-memory fallback is non-persistent: auth tokens and secure values are cleared on app restart.
