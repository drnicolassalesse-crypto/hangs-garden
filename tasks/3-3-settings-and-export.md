# Task 3-3 — Settings Screen & CSV Export

## Goal
Deliver spec §5.11 Settings in PWA-appropriate form: edit the local profile (display name, skill level, notification frequency, reminder time), request/review notification permission, export care history as CSV, and show an About section with app version and the Phase-1/iOS-PWA notes.

## Scope
- `src/features/settings/SettingsScreen.tsx` — single scrolling screen at `/settings`:
  - Profile section: name input, skill level + notification frequency as `ChoiceCard`s (reuse from onboarding), reminder time input (HH:MM)
  - Notifications section: current permission status, Enable/Disabled indicator, "Test reminder" button (requires granted permission) that fires a throwaway notification to confirm it works
  - Data section: Export care history (CSV) button
  - About: app version (from `package.json` via `import.meta.env.VITE_APP_VERSION` if set, else hardcoded), one-line data-privacy note ("All data stays on this device."), reset button (localStorage + IndexedDB — guarded by double confirm)
- `src/features/settings/csvExport.ts` — pure `toCareHistoryCSV(logs, pots, species)` returns a CSV string with columns `date,time,plant,species,action,outcome,notes`. Header row included; cells are RFC 4180–quoted.
- `src/features/settings/__tests__/csvExport.test.ts` — round-trip: builds 3 logs → exports → parses header + row counts; special characters (comma, quote, newline) are escaped.
- `src/App.tsx` — add `/settings` route; add a settings gear icon in Today header.

## Acceptance criteria
- Saving Settings updates the Zustand profile store + Dexie `profile` row atomically; after reload the values persist and the Today greeting reflects the new name.
- Changing notification_frequency or reminder_time triggers `syncNotifications()` to re-plan.
- Export CSV generates a downloadable blob with ≥ 1 data row when any `care_logs` exist; correct CSV escaping verified by unit tests.
- "Test reminder" produces a native Notification in < 2 s when permission is granted.
- Reset clears `profile`, all pots/tasks/logs/sites/journal/images (keeps species seed) after two confirmations.
- `npm test` ≥ 4 new tests; `npm run typecheck`, `npm run build` clean.

## Out of scope
- Avatar upload on settings (profile.avatar_blob_id stays `null` for MVP)
- iCal export (CSV only)
- Multi-profile / sign-in (out of scope everywhere — PWA is single-profile)
