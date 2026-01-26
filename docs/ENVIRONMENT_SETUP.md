# Environment Setup

## Required variables
The app requires the following environment variables at build/runtime:
- `EXPO_PUBLIC_API_BASE_URL` → **API base URL** (e.g., `https://api.example.com`)
- `EXPO_PUBLIC_ENV_NAME` → **Environment name** (`development`, `preview`, `production`)

These are validated at startup by `src/config/env.js`. If missing or invalid, the app throws
an error immediately (dev shows a red screen; production fails fast with a configuration error).

## Expo / EAS configuration
`app.config.js` passes validated values into `expo.extra` and fails the build if any required
variables are missing.

`eas.json` profiles include placeholders for required variables. Replace them via EAS secrets
or CI environment variables:

```bash
eas secret:create --name EXPO_PUBLIC_API_BASE_URL --value "https://api.dev.example.com"
eas secret:create --name EXPO_PUBLIC_ENV_NAME --value "development"
```

## Notes
- Do **not** use localhost fallbacks in production builds.
- Keep environment-specific base URLs isolated per build profile.
