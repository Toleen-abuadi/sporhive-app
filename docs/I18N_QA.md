# i18n QA Checklist

## Coverage
- [ ] No hardcoded, user-facing strings remain in screens or shared components (text, labels, placeholders, buttons, empty/error states, alerts, toasts).
- [ ] All headers and navigation titles use `t()`.
- [ ] All accessibility labels use `t()`.
- [ ] All modal/alert/toast messages use `t()`.

## Keys & Naming
- [ ] Use module namespaces (e.g., `auth.*`, `services.*`, `playgrounds.*`, `portal.*`, `academyDiscovery.*`, `common.*`, `errors.*`, `empty.*`).
- [ ] Reuse `common.*` keys for shared actions (e.g., `common.cancel`, `common.save`, `common.retry`).
- [ ] Avoid duplicate keys for the same meaning—prefer existing keys.
- [ ] Provide EN + AR entries for every new key.

## RTL & Layout
- [ ] Prefer RTL-safe alignment (e.g., `textAlign: 'start'`, `marginStart`/`marginEnd`) when adding new styles.
- [ ] Confirm directional icons mirror correctly in RTL (use existing RTL-aware logic/components).

## Quick Verification
1. Switch app language between EN and AR.
2. Visit every screen/module and confirm there are no missing translation warnings.
3. Validate RTL layout (alignment, spacing, icon direction) on AR.
4. Confirm placeholders and accessibility labels are localized.

