# Task 3-1 — Notifications (Android-primary, iOS best-effort)

## Goal
Deliver per-pot reminders from spec §6, adapted for a PWA:
- **Primary source of truth is the Today screen** — it computes due/overdue on every open, so the user never silently misses a plant even if the OS drops a notification.
- **Best-effort local notifications** via the Notification Triggers API (Chromium on Android) + a `setTimeout`-based fallback that works while the app/tab stays open.
- **iOS Safari PWA** currently gets no scheduled notifications from the browser; the feature quietly degrades to "Today-only" on that platform.

## Scope
- `src/domain/notifications.ts` — pure planner. `planNotifications({ tasks, frequency, reminderTime, now, horizonDays })` returns `PlannedNotification[]` with `{ id, taskId, fire_at, kind, title, body }`, covering:
  - `due` at `next_due_at` shifted to `reminder_time` (the profile-configured HH:MM)
  - `pre_1d` one day before due when frequency is `moderate` or `frequent`
  - `pre_2d` two days before when frequency is `frequent`
  - `overdue` one day after due when frequency is `frequent`
  - `snooze_expiry` at `snooze_until` if set and in the future
  - Drops notifications in the past, for disabled tasks, or past the horizon (default 60 days)
- `src/services/notifications.ts` — browser runtime:
  - `requestPermission()` — prompt on demand, never automatically
  - `syncNotifications()` — fetches tasks + profile, calls the planner, caps to platform limit, then:
    1. If `showTrigger` is supported (Chromium), uses `registration.showNotification({ showTrigger, tag, data })` per item
    2. Else schedules foreground `setTimeout`s through `registerForegroundFallback(planned)` — only fires while the tab is open
  - `cancelAllScheduled()` — clears both mechanisms before re-syncing
  - Notification `data.taskId` + a service-worker `notificationclick` handler navigate to `/plants/:potId?task=:taskId`
- `src/sw/notificationHandler.ts` — a tiny `notificationclick` listener importable from any SW entry; we wire it into `vite-plugin-pwa` via `injectManifest` mode for this task.
- `vite.config.ts` — switch to `strategies: 'injectManifest'` + custom `sw.ts`
- `src/sw/sw.ts` — SW that calls `precacheAndRoute(self.__WB_MANIFEST)`, registers the click handler
- Integration: `syncNotifications()` is called:
  - on app boot after seeding
  - after every `completeTask` / `skipTask` / `snoozeTask` / `toggleTaskEnabled` / `saveCustomSchedule` / pot create/update/delete
- UI affordance: a top-of-Today banner ("Turn on reminders") when `Notification.permission === 'default'` and the user hasn't dismissed it yet (dismissal stored in localStorage).
- Tests: `src/domain/__tests__/notifications.test.ts` covers the planner for each frequency, reminder-time offset, snooze expiry scheduling, horizon clamping, disabled-task exclusion.

## Acceptance criteria
- Unit tests for the planner are green (≥ 6 cases).
- Plan matches spec §6.1 & §6.2 for all three frequencies.
- Requesting permission is gated on the user tapping the banner or Settings → Notifications (never prompted automatically).
- `syncNotifications()` is idempotent — calling it twice produces the same scheduled set.
- Service worker registration still passes Lighthouse installability.
- `npm run build` emits a valid `sw.js`; `npm test` and `npm run typecheck` pass.

## Out of scope
- Server-side push (requires a backend — explicitly out per PWA plan)
- Android `AmbientLightSensor` (that's Task 3-4 territory if at all)
- Custom notification sounds
