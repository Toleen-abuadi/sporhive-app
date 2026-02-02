# Session Restore Behavior

## Token precedence
When restoring auth state from storage, the app resolves the access token in the following order:

1. `session.token` (preferred)
2. Stored auth token (`sporhive_auth_token`)
3. Legacy storage keys (`token`, `access`, `authToken`, `access_token`, `tokens`)

If a legacy session contains older token fields (for example `session.tokens.access` or `session.access_token`), the app
migrates those values into `session.token`, removes the old fields, and then writes the unified token back to
`sporhive_auth_token` so API clients immediately use it.
If no token can be resolved, stored auth/session data is cleared to avoid stale tokens.
