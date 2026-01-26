# SporHive – QA Checklist & Test Plan (Production Readiness Pass)

## 1) Environment Setup
- Node.js version: use the repo’s `.nvmrc` (if present) or the version used in CI.
- Install dependencies: `npm install` (or `yarn install` if the repo standard is yarn).
- Expo CLI: use `npx expo` for commands.
- Android:
  - Ensure Android Studio + SDK tools are installed.
  - Verify `ANDROID_HOME` and emulator availability.
- iOS (macOS only):
  - Xcode + command line tools.
  - CocoaPods if required by native modules.

## 2) Smoke Tests (5–10 minutes)
- App launches without crash.
- Auth hydration works (session persists, no flicker to login then services).
- Services screen loads.
- Playgrounds venues list loads.
- Player portal overview loads (player account only).

## 3) Full Functional Test Matrix

### A) Auth Flow
- Fresh install: Welcome → Login → Services.
- Public login success → Services.
- Player login success → Services + Portal visible.
- Logout from quick settings sheet → returns to login; cannot go back to services.
- Incorrect password shows correct error message.
- Offline mode shows network error.
- RTL toggle updates immediately.

### B) Services Screen
- Player Portal card hidden for public users.
- Player Portal card visible for player users.
- Trending venues load from API.
- Avatar quick settings sheet works (theme, language, logout).

### C) Playgrounds Module (Public + Player)
- Venues list:
  - Filters apply correctly (activity/date/players/location/offer/sort).
  - Empty state shown when no results.
- Venue details loads correctly.
- Date change triggers slots API with correct payload (date required).
- Duration selection updates pricing and available slots.
- Slot selection works.
- Booking create payload is correct.
- Success screen shows code/price.
- My Bookings updates without restart.
- Player user also sees My Bookings without “login required” if session exists.
- CLIQ upload works if enabled.

### D) Academy Discovery
- Map view loads pins.
- List view loads cards.
- Filters apply correctly.
- Search debounce works.
- Details screen loads and back works.

### E) Player Portal
- Overview loads without 403 (correct headers).
- Profile fields render safely.
- Lists load (payments/orders) if present.
- Filters apply correctly.
- 401/403 shows friendly re-auth CTA.

### F) Settings / Quick Actions
- Theme toggle switches (light/dark/system).
- Language switcher updates UI and RTL direction.
- Logout clears session and returns to login.

### G) Navigation / Back Behavior
- AppHeader back on all non-root screens.
- Deep links: safeBack fallback sends users to Services.

## 4) Visual QA (Light/Dark + RTL/LTR)
- Light mode contrast (buttons, text, cards).
- Dark mode contrast (text readable, no noisy shadows).
- RTL alignment (headers, cards, chevrons, paddings).
- Text truncation works (no overflow).
- Touch targets at least 44px.
- Loading skeletons look consistent.

## 5) Edge Cases & Defensive Rendering
- API returns empty arrays (no crashes).
- API returns null images (placeholders used).
- Slow network (loading states shown).
- Token missing fields in storage (fails gracefully).
- Deep links/direct route entry (safeBack fallback works).

## 6) Regression Hotspots
- Auth hydration + auto-redirect logic.
- Services role-based visibility (public vs player).
- Playgrounds bookings payloads and date handling.
- Portal session validation and refresh.
- RTL layouts for headers, cards, and filters.

## 7) Release Checklist
- No console warnings.
- No red screen errors.
- Android build succeeds (if config present).
- Lint passes (if configured).
- i18n keys complete (no missing translations).
- Routes are reachable and no orphan screens.

## 8) Known Constraints / Assumptions
- API responses may omit nested fields; screens must guard optional fields.
- Player portal access depends on valid portal session; invalid sessions should prompt re-auth.
- Map view requires valid location permissions for “nearest” sort.

## 9) How to Run Checks Locally
- Lint: `npm run lint` (if configured).
- Unit tests: `npm test` (if configured).
- Start Metro: `npx expo start`.
- Android build: `npx expo run:android` (if native setup is present).
- iOS build (macOS): `npx expo run:ios`.
