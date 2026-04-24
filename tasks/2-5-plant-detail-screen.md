# Task 2-5 — Plant Detail Screen & Task Detail Sheet

## Goal
Per-pot detail screen at `/plants/:potId` with three tabs (Care / Journal / Info) per spec §5.5, plus a slide-up Task Detail sheet per spec §5.6. Enables the user to see the full picture for one pot, toggle a task on/off, rename the pot, and drill into a task's history and per-task actions.

## Scope
- `src/features/plants/PlantDetailScreen.tsx` — route component, loads pot + species + site + tasks + recent logs, renders header + tabs
- `src/features/plants/tabs/CareTab.tsx` — list of all 6 care tasks for the pot; each row: emoji, action name, enable toggle, interval, last/next dates; tap opens Task Detail sheet; "Edit schedule" button placeholder (links to disabled alert until Task 2-7)
- `src/features/plants/tabs/JournalTab.tsx` — chronological list of `JournalEntry` records; "+ Add entry" button (disabled placeholder — full composer is Task 3-2)
- `src/features/plants/tabs/InfoTab.tsx` — species info (name, family, difficulty, light, toxicity, description), pot parameters, calculated-vs-custom indicator, "Edit pot" button placeholder (Task 2-7), **Delete plant** destructive action with `confirm()` then `potsRepo.delete` → navigate to /plants
- `src/features/plants/TaskDetailSheet.tsx` — slide-up modal: action name + icon, care instructions (skill-level aware — for now: Beginner uses species.description, Intermediate/Expert = shorter), current interval, last performed, next due, recent log list, buttons Done/Snooze/Skip (reusing the services from Task 2-3)
- `src/features/plants/renamePot.tsx` — tiny inline rename input (tap on the header display name toggles an input, Enter saves via `potsRepo.update`)
- `src/features/plants/actions.ts` — `toggleTaskEnabled(taskId)`, `deletePot(potId)`, `renamePot(potId, newName)`
- `src/App.tsx` — add `/plants/:potId` route
- Tests:
  - `src/features/plants/__tests__/plantActions.test.ts` — toggleTaskEnabled flips flag and persists; deletePot cascades (already covered in repo tests but re-verify at service layer); renamePot updates display_name

## UX details
- Header: large photo (or fallback tile), display name (editable), site badge, species common+scientific name, back button.
- Tabs: segmented control at the top of the content area. Keep the three tabs visible at all times.
- Care tab rows: toggle on the right, tapping row body (not the toggle) opens the Task Detail sheet.
- Task Detail sheet: overlay dims the page, dismissible by tap-outside or a close button; action buttons at the bottom.
- Deleting a plant requires a `confirm()` dialog and shows a short inline warning about cascading logs/journal entries.

## Acceptance criteria
- Opening a pot from `/plants` navigates to the detail screen and shows 6 tasks.
- Toggling a task off writes `is_enabled = false`; the task then disappears from Today for that user session (Today's load reads enabled only).
- Task Detail sheet Complete / Snooze / Skip actions update the task + care_logs identically to the Today screen and show in the sheet's history list after a reload.
- Deleting a plant navigates back to /plants and the pot plus all its tasks/logs/journal are gone (re-uses cascade from repo).
- Renaming the pot persists; reloading the page shows the new name.
- All existing tests still green; ≥ 3 new tests for plant actions; typecheck + build clean.

## Out of scope
- Custom schedule editor (Task 2-7)
- Edit pot parameters (Task 2-7)
- Journal composer with photos (Task 3-2)
- Skill-level-specific care instructions (§7.2) — we use the species description for now
