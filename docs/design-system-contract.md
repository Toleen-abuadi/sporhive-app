# SporHive Design System Contract

## Purpose
This document defines the foundation for SporHive’s design system so all screens share the same theme, typography, spacing, and motion. It must be treated as the single source of truth for UI styling and theming across the app.

**Primary goals**
- Premium, sporty, modern, calm feel with orange energy accents.
- Consistent spacing, typography, and alignment in LTR/RTL.
- Light/Dark/System themes with accessible contrast.

---

## Branding Guidelines
**Identity keywords**: premium • sporty • modern • calm • clean surfaces • generous whitespace

### Brand palette (base)
- Brand Primary: `#FF7A00`
- Brand Pressed: `#E96A00`
- Brand Soft: `#FFF1E6`
- Neutral 900: `#0B0F14`
- Neutral 800: `#111827`
- Neutral 700: `#334155`
- Neutral 600: `#475569`
- Neutral 500: `#64748B`
- Neutral 200: `#E5E7EB`
- Neutral 100: `#F3F4F6`
- Background Light: `#FAF7F2`
- Surface Light: `#FFFFFF`
- Background Dark: `#0B0F14`
- Surface Dark: `#111827`
- Text Primary Light: `#101828`
- Text Secondary Light: `#667085`
- Text Primary Dark: `#F8FAFC`
- Text Secondary Dark: `#94A3B8`
- Success: `#22C55E`
- Error: `#EF4444`
- Warning: `#F59E0B`
- Info: `#3B82F6`

**Implementation:** See `src/theme/theme.js` for the canonical mapping into semantic colors.

---

## Theme Foundations (Light/Dark)
### Semantic colors
Use these semantic tokens only — never hardcode hex values in new components.

- `background`: app background
- `surface`: card/section background
- `surfaceElevated`: elevated surface (cards, sheets)
- `border`: subtle separators
- `textPrimary`, `textSecondary`, `textMuted`
- `primary`, `primaryPressed`, `primarySoft`
- `accent`, `accentStrong`, `accentSoft` (alias of brand)
- `success`, `warning`, `error`, `info`

**File:** `src/theme/theme.js`

---

## Typography
Use the app Text component (`src/components/ui/Text.js`) with variants.

| Variant | Size / Line Height | Weight |
| --- | --- | --- |
| display | 32 / 40 | 700 |
| h1 | 24 / 32 | 700 |
| h2 | 20 / 28 | 700 |
| h3 | 18 / 26 | 600 |
| body | 16 / 24 | 400 |
| caption | 13 / 18 | 400 |
| overline | 12 / 16 | 600 |

**Guidelines**
- System font only unless a custom font is introduced in the future.
- RTL: rely on `Text` which automatically aligns to start and sets writing direction.

**File:** `src/theme/tokens.js` (typography scale + variants)

---

## Spacing
**Scale** (dp):
- `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=20`, `2xl=24`, `3xl=32`, `4xl=40`

**File:** `src/theme/tokens.js`

---

## Radii
- `sm=10`, `md=14`, `lg=18`, `xl=24`, `pill=999`

**File:** `src/theme/tokens.js`

---

## Shadows
Use soft shadows in light mode. In dark mode, prefer subtle borders or elevated surfaces to reduce heavy shadows.

- `shadow.sm`
- `shadow.md`
- `shadow.lg`

**File:** `src/theme/tokens.js`

---

## Motion
**Durations**
- `fast=140ms`
- `base=220ms`
- `slow=320ms`

**Easing**
- `standard=“easeOut”`

**File:** `src/theme/tokens.js`

---

## Icon sizing
- `xs=16`, `sm=20`, `md=24`, `lg=28`, `xl=32`

**File:** `src/theme/tokens.js`

---

## Layout primitives
### AppScreen (`src/components/ui/AppScreen.js`)
Use for every screen to ensure consistent padding, safe area handling, keyboard avoidance, and background colors.

**Props**
- `scroll` (boolean) — wrap content in ScrollView
- `keyboardAvoiding` (boolean)
- `variant` = `default | subtle | transparent`
- `paddingHorizontal`, `paddingTop`, `paddingBottom`

### AppHeader (`src/components/ui/AppHeader.js`)
Unified top bar with back button, title/subtitle, right actions, and RTL support.

**Props**
```
<AppHeader
  title="..."
  subtitle="..."
  showBack
  right={<HeaderActions />}
  variant="default|transparent"
  centerTitle={false}
/>
```

---

## Usage Guidelines
- ✅ Use semantic color tokens (from `useTheme()`), not hex strings.
- ✅ Use `AppScreen` for padding + safe area.
- ✅ Use `AppHeader` for all non-root screens with back navigation.
- ✅ Use `Text` variants for typography.
- ✅ Align text to start (RTL-safe) by default.
- ❌ Do not add ad-hoc inline colors for new components.

---

## Future Work (Batch Refactor)
- Replace remaining legacy `Screen`, `TopBar`, and inline layout styles with `AppScreen` + `AppHeader`.
- Consolidate legacy colors from `theme/colors.js` consumers into `useTheme()`.
