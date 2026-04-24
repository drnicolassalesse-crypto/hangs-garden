# Task 2-6 — Sites Screens

## Goal
Deliver the Sites list and Site Detail screens from spec §5.10. Users can group pots by room/location (Balcony, Kitchen, etc.), rename, and delete a site (pots inside are re-parented to "no site", not deleted — already the behaviour in `sitesRepo.delete`).

## Scope
- `src/features/sites/SitesScreen.tsx` — list of sites with pot count, inline "+ New site" composer (icon + name), tap a row to open Site Detail. Empty state explains sites.
- `src/features/sites/SiteDetailScreen.tsx` — site header with icon + name (inline rename), list of pots using the existing `PlantCard` (list mode), delete button (with confirm) that calls `sitesRepo.delete` and navigates back to `/sites`.
- `src/features/sites/actions.ts` — thin pass-through to `sitesRepo.rename` / `sitesRepo.delete` / `sitesRepo.create` for symmetry with other features.
- `src/App.tsx` — add `/sites` and `/sites/:siteId` routes. Add a "Sites" link to the Today screen header.
- `src/features/sites/__tests__/sitesFlow.test.ts` — create site + assign pot + rename + delete; verify pots survive with `site_id = null`.

## UX
- Icon picker: a small grid of preset emojis (🌿 🪴 🏡 🍳 🛋️ 🛏️ 🚿 🌞 🪟 🌷 — picks a starting set) plus a free-text input (2-char limit) for anything else.
- List rows: `icon · name · (N pots)`; chevron on the right.
- Site Detail: shows the pots grouped in a list; "Add plant" CTA under the list goes to `/add` (the Add flow already has inline site creation, but user can also pre-select).

## Acceptance criteria
- Creating a site appears immediately in the list and in the Add Plant Step 2 site chips.
- Renaming persists and shows in both places after reload.
- Deleting a site removes it and the pots it contained are still present in My Plants with no site badge.
- `npm test` green with ≥ 3 new tests; `npm run typecheck` + `npm run build` clean.

## Out of scope
- Swipe-to-delete gesture (web/iOS Safari don't handle swipe consistently across browsers; we use explicit buttons).
- Site-scoped Today (Today already has a site filter dropdown from Task 2-3; a dedicated site-filtered Today view inside Site Detail is not in the spec's must-have list — we link to Today with the site selected via query param instead if needed later).
