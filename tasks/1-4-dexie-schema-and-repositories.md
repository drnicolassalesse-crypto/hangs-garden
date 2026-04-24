# Task 1-4 — Dexie Schema & Repositories

## Goal
Implement the persistence layer using Dexie over IndexedDB. The schema mirrors spec §9.4 (one Dexie table per SQL table), with PWA-specific adaptations (no `users` table — single local `profile`; image bytes stored in an `images` Blob table referenced by id from pots/logs/journal/profile).

Repositories expose Promise-returning CRUD functions that the UI/services consume — UI never imports Dexie directly. This isolation is what allows a future Capacitor wrap or RN port to swap the storage backend without changing screens.

## Scope
- `src/data/db.ts` — Dexie subclass declaring all tables with indexes
- `src/data/ids.ts` — UUID helper (`crypto.randomUUID` with fallback)
- `src/data/repositories/`
  - `species.ts`
  - `sites.ts`
  - `pots.ts`
  - `careTasks.ts`
  - `careLogs.ts`
  - `journal.ts`
  - `profile.ts`
  - `images.ts` (Blob put/get/delete + ObjectURL helper)
- `src/data/__tests__/repositories.test.ts` — covers create/read/update/delete + cascade-on-pot-delete + uniqueness of profile singleton
- Add `dexie` and dev dep `fake-indexeddb` for tests

## Tables and indexes (mirrors §9.4)
- `plant_species` — pk `id`, indexes `common_name`, `family`
- `sites` — pk `id`, index `created_at`
- `pots` — pk `id`, indexes `species_id`, `site_id`, `created_at`
- `care_tasks` — pk `id`, indexes `pot_id`, `[pot_id+action_type]`, `next_due_at`, `is_enabled`
- `care_logs` — pk `id`, indexes `pot_id`, `care_task_id`, `performed_at`
- `journal_entries` — pk `id`, indexes `pot_id`, `created_at`
- `images` — pk `id` (Blob payload field, no other indexes)
- `profile` — pk `id` (single row; `getProfile()` always returns the one row or null)

## Repository contracts (concise)
- `species`: `listAll()`, `getById(id)`, `bulkUpsert(records)` (used by the seeder in 1-5)
- `sites`: `listAll()`, `create(input)`, `rename(id, name, icon)`, `delete(id)`
- `pots`: `listAll()`, `getById(id)`, `listBySite(siteId|null)`, `create(pot, tasks)` (atomic), `update(pot)`, `delete(id)` (cascades to tasks, logs, journal entries via a single transaction)
- `careTasks`: `listByPot(potId)`, `getById(id)`, `update(task)`, `replaceForPot(potId, tasks)` (used by recalc / custom schedule edits)
- `careLogs`: `appendMany(logsWithoutIds)`, `listByPot(potId)`, `listByTask(taskId)`, `listAllForExport()`
- `journal`: `listByPot(potId)`, `create(entry)`, `update(entry)`, `delete(id)`
- `profile`: `get()`, `upsert(profile)`
- `images`: `put(blob): UUID`, `get(id): Blob | undefined`, `delete(id): void`, `objectUrl(id): string | null`

## Acceptance criteria
- `npm test` passes including new repo tests using `fake-indexeddb`.
- Deleting a pot removes its `care_tasks`, `care_logs`, and `journal_entries` in a single transaction.
- `profile.get()` returns `null` for a fresh DB; `upsert` followed by `get` returns the stored row.
- `pots.create` writes the pot and all 6 care tasks in a single transaction (rolls back together on failure).
- `npm run typecheck` passes.

## Out of scope
- Species seed data (Task 1-5)
- Profile seeding / onboarding flow (Task 2-1)
- Any UI consumption (Tasks 2-1 onward)
