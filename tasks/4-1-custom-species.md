# Task 4-1 — Custom Species Creation

## Goal
Let the user add their own plant species on the device, complete with a photo, Vietnamese name, default intervals, etc. Custom species appear next to bundled species in every search (Add Plant, My Plants) and can be edited or deleted. Re-seeding the bundled list must never wipe user-created species.

## Scope
- `src/domain/types.ts` — extend `PlantSpecies` with optional fields:
  - `image_blob_id?: UUID | null` (photo stored via `imagesRepo`)
  - `is_custom?: boolean` (marks user-created rows; missing = bundled)
- `src/data/seeders.ts` — change the gate to version-only: skip the re-upsert entirely when `localStorage['planta.seed.version']` matches the current seed version. Custom species already survive (different UUID ids) but this removes the wasted boot-time bulkPut.
- `src/features/species/SpeciesLibraryScreen.tsx` — new screen at `/species` (replaces the inline list in `App.tsx`). Lists all species with a "+ Custom" button at top, sorted alphabetically. Custom rows show an edit pencil + delete kebab.
- `src/features/species/CustomSpeciesForm.tsx` — form used for both create (`/species/new`) and edit (`/species/:speciesId/edit`, only when `is_custom`). Fields:
  - Common name (required)
  - Vietnamese name (optional — becomes a `vi_name:*` tag)
  - Scientific name (optional)
  - Family (optional)
  - Description (optional, short textarea)
  - Difficulty, light requirement, toxicity (pickers)
  - Photo upload (optional, resolves via `imagesRepo`)
  - Six care-default intervals (numeric, min 1)
- `src/features/species/speciesActions.ts` — `createCustomSpecies(input)`, `updateCustomSpecies(id, patch)`, `deleteCustomSpecies(id)` with a guard refusing to mutate non-custom rows.
- `src/App.tsx` — add `/species`, `/species/new`, `/species/:speciesId/edit` routes and a "Species library" link from Settings and from the Add Plant Step 1 search (so user can jump out to create one mid-flow and come back).
- Tests: `src/features/species/__tests__/customSpecies.test.ts` covers create/update/delete, the `deleteCustomSpecies` guard refusing to delete a bundled (`is_custom` missing/false) species, and a re-seed that leaves custom species untouched.

## Acceptance criteria
- Creating a custom species with `common_name: "Khoai môn"` and `vi_name: "Khoai môn"` makes it findable by `khoai` or `môn` in Add Plant's search.
- Editing is allowed only for `is_custom` species — the form is closed to bundled ones.
- Reseeder run with a bumped `SEED_VERSION` re-upserts seed rows but leaves custom rows intact.
- `npm test` green; typecheck + build clean.

## Out of scope
- JSON export/import (user confirmed "create new manually" only for this round)
- Per-skill-level care instructions — custom species only have the one `description` field
