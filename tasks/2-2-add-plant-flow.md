# Task 2-2 — Add Plant Flow

## Goal
Implement the multi-step Add Plant flow from spec §5.7. On submit, atomically create one `Pot` + six `CareTask` records using `buildInitialTasks` from the schedule engine. After save, route the user to a placeholder list of their pots.

## Scope
- `src/features/add-plant/AddPlantFlow.tsx` — controller component, holds draft state and step index
- `src/features/add-plant/steps/` — one file per step:
  - `StepSpecies.tsx` — search + list of bundled species (matches `common_name`, `scientific_name`, and the `vi_name:*` tag)
  - `StepName.tsx` — display name (defaults to species `common_name`), optional photo upload, site picker (existing sites + inline "New site")
  - `StepPotDetails.tsx` — pot size (XS/S/M/L/XL), material, soil
  - `StepLightLocation.tsx` — light level, location type
  - `StepLastDates.tsx` — optional last watered / last fertilized date pickers
  - `StepReview.tsx` — summary card with calculated schedule preview, Save button
- `src/features/add-plant/draft.ts` — `AddPlantDraft` type + `defaultDraft()` factory
- `src/features/add-plant/saveDraft.ts` — pure-ish save function that builds Pot + tasks from a finished draft and calls `potsRepo.create`
- `src/features/plants/MyPlantsListPlaceholder.tsx` — temporary list at `/plants` so we can see what we created (real grid lands in Task 2-4)
- Route `/add` and `/plants` wired into `App.tsx`. Home gets an "Add a plant" CTA and a "View my plants" link.
- `src/features/add-plant/__tests__/saveDraft.test.ts` — covers: pot row created, 6 enabled tasks created with intervals from the schedule engine, custom `last_performed_at` honoured.

## Step rules (from spec §5.7)
- Step 1 select advances to Step 2; the chosen species id is locked into the draft.
- Step 2: name pre-fills with species `common_name`. Photo upload is optional and stored as a Blob via `imagesRepo.put`. Site picker shows current sites and a "+ New site" inline form.
- Steps 3 / 4 default to: pot_size `m`, material `plastic`, soil `standard`, light `medium`, location `indoor`.
- Step 5: leaving both dates blank means `last_performed_at = null` for the corresponding tasks (engine will use `pot.created_at` as baseline). If a date is provided in the past, it's accepted; the user will see the task as overdue immediately, which is intended (spec §8.4).
- Step 6 Save → `potsRepo.create(pot, tasks)`, then `navigate('/plants')`.

## Acceptance criteria
- Walking the flow in `npm run dev` ends with the new pot visible at `/plants`.
- Test: with a sample species (watering=7d) and pot_size XL → calculated watering interval 11d (7×1.6=11.2→11), watering task's `next_due_at` = pot.created_at + 11d.
- Test: providing `last_watered = pot.created_at − 10d` with a 7-day interval yields a watering `next_due_at` that's already in the past (confirms §8.4 behaviour).
- All 6 task rows land in `care_tasks`, all `is_enabled = true`.
- `npm run typecheck`, `npm test`, `npm run build` all pass.

## Out of scope
- Real My Plants screen with grid/sort/filter (Task 2-4)
- Sites management screen (Task 2-6) — we only allow inline create from this flow
- Image resizing — accept the original Blob for now; resizing helper lands with photo polish
- Light Meter shortcut (Task 3-4)
