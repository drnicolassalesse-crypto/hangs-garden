# Task 4-2 — Fertilizer Management & Picker

## Goal
Let the user maintain a library of fertilizers (many brands in VN) with a photo, type, and NPK ratio, then pick one (optionally) when marking a Fertilize task Done. Each pot remembers its last-used fertilizer so the picker pre-selects it next time.

## Scope

### Data
- `src/domain/types.ts` — add:
  - `FertilizerType = 'liquid' | 'granular' | 'slow_release' | 'organic' | 'other'`
  - `Fertilizer { id, name, type, npk: string|null, notes: string|null, photo_blob_id: UUID|null, created_at }`
  - `CareLog.fertilizer_id?: UUID | null` (optional, backward compatible)
- `src/data/db.ts` — version 2 adds a `fertilizers` table (`pk id, created_at, name`). Existing version 1 tables unchanged. No migration code needed (Dexie handles add-table upgrades automatically).
- `src/data/repositories/fertilizers.ts` — `listAll()`, `getById()`, `create(input)`, `update(id, patch)`, `delete(id)`. Delete cascades the `photo_blob_id` via `imagesRepo.delete` when set.
- `src/data/repositories/index.ts` — re-export `fertilizersRepo`.

### Domain
- `src/domain/fertilizers.ts` — pure helper `pickLastFertilizerId(logs)` returns the `fertilizer_id` of the most recent `fertilizing` log with a non-null fertilizer_id. Unit tested.

### UI
- `src/features/fertilizers/FertilizersScreen.tsx` — list at `/fertilizers`. Each row: thumbnail, name, type pill, NPK. "+ New fertilizer" button.
- `src/features/fertilizers/FertilizerForm.tsx` — form for create (`/fertilizers/new`) and edit (`/fertilizers/:fertilizerId/edit`). Fields: name (required), type (select), NPK (optional text input with placeholder `10-10-10`), notes (optional), photo.
- `src/features/fertilizers/FertilizerPicker.tsx` — small bottom-sheet overlay. Props: `preselectId`, `onPick(id | null)`, `onCancel`. Shows "No fertilizer (skip)" as first option.
- `src/features/today/TaskCard.tsx` + `src/features/plants/TaskDetailSheet.tsx` — when the task's `action_type === 'fertilizing'` and at least one fertilizer exists, open the picker before calling `completeTask`; the chosen id gets passed through to the log.
- `src/features/today/actions.ts` — `completeTask(taskId, fertilizerId?: UUID|null, now?)` writes the id into the log.

### Integrations
- `src/App.tsx` — routes `/fertilizers`, `/fertilizers/new`, `/fertilizers/:id/edit`.
- `src/features/settings/SettingsScreen.tsx` — add a "Fertilizer library" link next to "Species library".
- `src/features/plants/tabs/CareTab.tsx` — on the fertilize row, show a small "last: {Name}" chip when a previous log has one.

### Tests
- `src/features/fertilizers/__tests__/fertilizersFlow.test.ts`:
  - create + update + delete cycle
  - `completeTask(taskId, fertilizerId)` writes a log with that id
  - `pickLastFertilizerId` returns the most recent (among multiple) `fertilizing` logs with a non-null id
  - deleting a fertilizer nulls its photo blob but leaves existing historical logs alone (CareLog.fertilizer_id may point at a deleted record — we keep the log intact; resolver code should render "Deleted fertilizer" if lookup fails)

## Acceptance criteria
- Adding 2 fertilizers and marking a Fertilize task Done prompts a picker; selecting one records it in the log.
- Next Fertilize for the same pot pre-selects that fertilizer.
- Fertilize tasks on other pots keep their own per-pot memory.
- Deleting a fertilizer removes it from future pickers but preserves historical care logs.
- Typecheck + build clean; ≥ 4 new tests.

## Out of scope
- Brand field (user unchecked it)
- Importing a shared fertilizer catalogue
- Bulk import/export
