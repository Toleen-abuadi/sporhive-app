You are a coding agent working in this repository.
Goal: Make the entire app use a single canonical token path and remove duplicated token/header helpers, per the Token Usage Scan PDF.

Hard rules:
- Do NOT delete files until all imports/usages are migrated and builds succeed.
- Keep using fetch (do not introduce axios).
- Keep API_BASE_URL exports working.
- After refactor, Authorization header must be set in exactly one place for app calls, and exactly one place for portal calls.
- Portal calls must include Authorization + X-Academy-Id + X-Customer-Id.
- Player portal APIs must use the public/user token (single token). If code currently differentiates portal token vs app token, unify to the public token.

Step plan (must follow in order):

STEP 0: Inventory
- Search for: authHeaders.js, binaryClient.js, portal.api.js, portal.store.js, portalSession.js, "Authorization", "Bearer ", "X-Academy-Id", "X-Customer-Id".
- Output a short summary of where these are used.

STEP 1: Choose portal API layer
- Keep src/services/api/playerPortalApi.js
- Migrate all callers of src/services/portal/portal.api.js to use the kept layer.

STEP 2: Centralize portal headers
- Create src/services/api/portalHeaders.js that returns:
  { Authorization: `Bearer ${token}`, 'X-Academy-Id': academyId, 'X-Customer-Id': customerId }
- Token must be the single public/user token source (the same token used for normal app requests).
- Academy/customer IDs should come from storage (same source used currently).

STEP 3: Centralize Authorization injection
- Ensure all API calls go through a single fetch wrapper (inside src/services/api/client.js is fine).
- Remove any remaining manual `Authorization: 'Bearer ' + token` creation outside the header builder(s).
- Migrate callers away from:
  - src/services/auth/authHeaders.js
  - src/services/api/binaryClient.js
- Ensure any binary download uses a single helper that injects the same Authorization token.

STEP 4: Delete portal API duplicate
- Delete src/services/portal/portal.api.js once no longer imported.

STEP 5: Consolidate portal session management
- Remove duplicated portal refresh/session logic across:
  - src/services/auth/portalSession.js
  - src/services/portal/portal.store.js
  - src/services/auth/auth.store.js
- Keep one canonical token persistence + refresh flow.
- Since we are unifying to one public token, portal refresh token handling should be removed or made consistent with the single token approach.

STEP 6: Remove legacy migration duplication
- Keep legacy migration only inside src/services/storage/storage.js
- Remove duplicated precedence/migration code elsewhere.

Final steps:
- Run lint/test scripts if present (package.json scripts).
- Run a TypeScript/JS build if available.
- Commit changes with clear commit message.
- Print a summary:
  - files changed
  - files deleted
  - how to test portal calls and portal images
