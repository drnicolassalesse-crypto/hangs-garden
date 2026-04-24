# Task 2-7 — Edit Pot & Custom Schedule Editor

## Goal
Implement the two editors referenced from Plant Detail placeholders:
- **Edit Pot** (spec §5.8): change pot physical parameters and site. On save, if the pot is on the auto schedule, `recalculateTasks` re-derives intervals + `next_due_at`. If the pot has a custom schedule (§8.3), intervals stay fixed.
- **Custom Schedule editor** (spec §5.9): toggle `use_custom_schedule` and edit the per-action interval in days for each enabled task; save updates intervals and re-anchors `next_due_at`.

## Scope
- `src/features/plants/EditPotScreen.tsx` — route `/plants/:potId/edit`. Reuses `StepPotDetails`, `StepLightLocation` step components (they already take `{ draft, onChange }`), plus an additional site picker. On save: `potsRepo.update`, then `careTasksRepo.replaceForPot(potId, recalculated)` when NOT on custom schedule.
- `src/features/plants/CustomScheduleScreen.tsx` — route `/plants/:potId/schedule`. Toggle for `use_custom_schedule`, number inputs per action (in days, min 1), live-computed calculated-default shown when the toggle is OFF (read-only). Save writes `use_custom_schedule` + `custom_schedule` on the pot and updates every task's `interval_days` + `next_due_at`.
- `src/features/plants/editActions.ts` — `updatePotParams({ potId, patch, tasks, species })` and `saveCustomSchedule({ potId, enabled, values })` orchestration functions that keep UI components thin.
- `src/features/plants/tabs/CareTab.tsx` — replace the `alert()` with a `<NavLink to="schedule" relative="path">`.
- `src/features/plants/tabs/InfoTab.tsx` — replace the `alert()` Edit pot button with a `<NavLink to="edit" relative="path">`.
- `src/App.tsx` — add `/plants/:potId/edit` and `/plants/:potId/schedule` routes.
- Tests: `src/features/plants/__tests__/editActions.test.ts` covers
  - updatePotParams on auto schedule: recalculates watering interval to reflect new pot_size, preserves `last_performed_at` as anchor when present.
  - updatePotParams with use_custom_schedule=true: does NOT change `interval_days`.
  - saveCustomSchedule(enabled=true) writes custom values and updates tasks to those intervals.
  - saveCustomSchedule(enabled=false): tasks revert to the calculated intervals.

## Acceptance criteria
- Navigating from Plant Detail → Care → Edit schedule opens the custom schedule screen; Info → Edit pot opens the pot editor.
- Toggling custom schedule ON locks user-entered intervals; after saving, future pot-param edits do not touch the tasks.
- Toggling custom schedule OFF and saving restores auto intervals from the current pot params.
- `npm test` green with ≥ 4 new tests; `npm run typecheck` + `npm run build` clean.

## Out of scope
- Edit Add Plant's Step 5 (last-care dates) from this flow — users can still use per-task Complete from the Task Detail sheet to reset the timer.
- Photo re-upload on Edit Pot (simple optional enhancement; can be added later with the image-resize polish).
