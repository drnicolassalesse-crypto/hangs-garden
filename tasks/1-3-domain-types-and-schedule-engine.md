# Task 1-3 — Domain Types & Schedule Engine

## Goal
Implement the framework-free TypeScript core that all UI/data layers will depend on:
- All entity types from spec §3 (PlantSpecies, CareDefaults, Pot, CareTask, CareLog, Site, CustomSchedule, JournalEntry, plus a local Profile type that replaces §2 Auth).
- The schedule calculation engine from spec §4 (multipliers, final interval, `next_due_at`, snooze/skip/complete state transitions).

Pure TypeScript only — no React, no Dexie, no browser APIs. Output should be importable from any environment (UI, service worker, future Capacitor/RN wrapper).

## Scope
- `src/domain/types.ts` — all entity types + enums
- `src/domain/schedule.ts` — pure functions
- `src/domain/__tests__/schedule.test.ts` — unit tests covering every multiplier table and every state transition rule
- `vitest.config.ts` + `vitest` dev dependency, `npm test` script

## Functions to expose from `schedule.ts`
- `computeWateringInterval(baseDays, params): number` — applies all 5 multipliers from §4.2, rounds, floors at 1.
- `computeIntervalForAction(action, species, pot): number` — returns watering interval via the function above; for all other actions returns the species default unchanged (per §4.3 note).
- `computeNextDueAt(task, pot): Date` — implements §4.4 (uses `pot.created_at` baseline if `last_performed_at` is null).
- `applyComplete(task, now): { task, log }` — §4.7
- `applySkip(task, now): { task, log }` — §4.6
- `applySnooze(task, until, now): { task, log }` — §4.5 (does NOT change `next_due_at`)
- `effectiveInterval(pot, species, action): number` — honours `pot.use_custom_schedule` and `custom_schedule` overrides per §8.3
- `bucketTask(task, now): 'overdue' | 'today' | 'upcoming' | 'later' | 'snoozed'` — used by Today screen (§5.3) — respects `snooze_until`

## Acceptance criteria
- `npm test` passes with at least one test per multiplier table row (5 tables × ~5 rows = ~25 cases) and per state-transition function.
- A pot with all baseline parameters (M / plastic / standard / medium / indoor) yields exactly the species base interval.
- `effectiveInterval` returns custom value when `use_custom_schedule = true` and the custom value is non-null; falls back to calculated otherwise.
- `bucketTask` correctly hides snoozed tasks until `snooze_until ≤ now`.
- `npm run typecheck` passes with no errors.

## Out of scope
- Persistence (Task 1-4, Dexie repos)
- Notification scheduling planning (Task 3-1 will consume `bucketTask` output)
