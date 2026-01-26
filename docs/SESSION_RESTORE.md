# Session Restore Behavior

## Token precedence
When restoring auth state from storage, the app resolves the access token in the following order:

1. `session.tokens.access` (preferred)
2. `session.tokens.token`
3. `session.token`
4. `session.access`
5. `session.access_token`
6. `session.authToken`
7. Stored auth token (`sporhive_auth_token`)
8. Legacy storage keys (`token`, `access`, `authToken`)

If a token is resolved, it is written back to `sporhive_auth_token` so API clients immediately use it.
If no token can be resolved, stored auth/session data is cleared to avoid stale tokens.
