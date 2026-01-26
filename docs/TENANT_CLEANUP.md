# Tenant Cleanup

## Tenant-specific keys
The app stores tenant-scoped selections and cached filters that must not cross users:
- `lastSelectedAcademyId` (`sporhive_last_academy_id`)
- Portal academy id (`sporhive_portal_academy_id`)
- Playgrounds filters/drafts containing `academyProfileId`
- Academy discovery cache (`sporhive_academy_discovery_state`)

## Cleanup behavior
The storage helper `storage.clearTenantState()` removes tenant-specific keys on logout and
whenever a stored academy selection does not match the current authenticated session.
This prevents cross-tenant leakage and forces the UI to reselect an academy when needed.
