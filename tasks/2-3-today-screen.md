# Task 2-3 — Today Screen

## Goal
Implement the Today screen from spec §5.3 as the app's new root (`/`). Shows all care tasks bucketed into **Overdue**, **Today**, and **Upcoming** (next 3 days), with per-card **Complete / Snooze / Skip** actions that persist via the repo + domain transitions from Tasks 1-3 and 1-4.

## Scope
- `src/domain/todayView.ts` — pure function `buildTodayView(tasks, pots, species, sites, now)` → structured sections ready to render. Uses `bucketTask` from `schedule.ts`; drops `is_enabled = false` tasks; sorts Overdue most-overdue-first, Today by due time, Upcoming by due date asc.
- `src/features/today/actions.ts` — services that combine domain transitions with persistence:
  - `completeTask(taskId)` — reads task, `applyComplete`, persists task update + log
  - `skipTask(taskId)`
  - `snoozeTask(taskId, untilTs)`
- `src/features/today/TodayScreen.tsx` — main component: fetches data, renders sections, filter chips, re-renders after an action
- `src/features/today/TaskCard.tsx` — one card per task with emoji + name + pot name + due label + action buttons
- `src/features/today/__tests__/actions.test.ts` — each action writes the correct CareLog and updates the task, using fake-indexeddb
- `src/domain/__tests__/todayView.test.ts` — bucketing + sort order + disabled filtering

## UX rules
- Filter chips at the top: **All / Water / Fertilize / Mist / Repot / Prune / Clean**. Site filter is a secondary dropdown (icon + name) that defaults to "All sites".
- Overdue section has a red accent strip, Today green, Upcoming grey.
- Each card shows:
  - action emoji + label (e.g. 💧 Water)
  - plant display name · species common name
  - site badge if assigned
  - due label: "3 days overdue" / "Today" / "in 2 days"
- Actions: ✅ Done (primary), 💤 Snooze (secondary, opens a small popover: 1d / 2d / 3d), ⏭ Skip (ghost, with `confirm()` dialog)
- Empty state (nothing due): "All caught up! 🎉 Your plants are happy."
- After any action, the affected card disappears from its current section (complete/skip reset it to `+interval`, snooze hides it until the snooze date).

## Acceptance criteria
- Tests for `buildTodayView`: overdue sort, today ordering, upcoming limit (≤ 3 days), disabled exclusion, snoozed hidden.
- Tests for actions: complete writes log `completed` + advances `next_due_at`; skip writes log `skipped` + advances; snooze writes log `snoozed` + sets `snooze_until` + does NOT touch `next_due_at` (spec §4.5).
- `/` route renders Today. Home CTAs still reachable via the Today empty state and an inline top-right link.
- `npm test` 68+ tests pass; `npm run typecheck` and `npm run build` clean.

## Out of scope
- Inline expand-to-show-instructions (that's Task Detail sheet §5.6 — lands with 2-5)
- Swipe-to-complete gesture (polish task later)
- Custom snooze date picker (we ship 1d/2d/3d quick buttons)
- Notifications — they come in Task 3-1
