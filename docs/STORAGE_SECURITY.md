# Storage Security

## Sensitive data handling
- Access tokens and refresh tokens are stored in Expo SecureStore.
- Portal tokens are stored in Expo SecureStore.
- Auth sessions persisted to AsyncStorage are sanitized to remove portal tokens.
- Player usernames/passwords are never persisted.

## Migration
On app start, the storage layer performs a one-time migration:
1. Reads legacy tokens from AsyncStorage (`sporhive_auth_token`, `sporhive_portal_auth_tokens`, and legacy keys).
2. Writes tokens into SecureStore.
3. Deletes legacy token keys and any stored portal username/password keys.

This keeps token persistence intact while ensuring sensitive data no longer lives in plain AsyncStorage.
