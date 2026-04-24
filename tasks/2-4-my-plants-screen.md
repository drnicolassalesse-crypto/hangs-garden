# Task 2-4 — My Plants Screen

## Goal
Replace the placeholder list at `/plants` with the real My Plants screen from spec §5.4. Grid-first with a toggle to list view, search by name or species, sort (name / next due / site), filter by site, and an "overdue" indicator per card. Tapping a card navigates to `/plants/:potId` (Plant Detail, Task 2-5).

## Scope
- `src/domain/plantSummary.ts` — pure function `summarizePlants(pots, tasks, species, sites, now)` → `PlantSummary[]` with: pot, species, site, nextDue (task + label), anyOverdue, hasEnabledTasks.
- `src/features/plants/MyPlantsScreen.tsx` — grid/list view, search field, sort dropdown, site filter, view-mode toggle.
- `src/features/plants/PlantCard.tsx` — shared card with two render modes (grid: photo-on-top; list: photo-on-left).
- `src/App.tsx` — replace `/plants` with the new screen; delete the placeholder file.
- `src/domain/__tests__/plantSummary.test.ts` — covers: next-due picks earliest enabled task, ignores snoozed, correct overdue flag, sort helpers, filter matching against EN + Vietnamese name tag.

## UX
- Top bar: back link to Today, title "My plants (N)", view-mode toggle on the right (Grid ⌗ / List ☰).
- Under the header: search input + sort dropdown (inline). Site filter becomes a second row of chips ("All" + each site).
- Each card shows:
  - Photo (or 🪴 fallback)
  - Display name
  - Species common name (muted)
  - Next due action chip: emoji + "in X days" / "Today" / "X overdue"
  - Small orange dot in the top-right corner if any enabled task is overdue
- Empty state: "No plants yet" with + Add a plant CTA.
- Grid view: 2 columns on narrow screens, tap target = whole card.

## Acceptance criteria
- Search `rau` matches "Vietnamese Coriander" via its `vi_name:Rau răm` tag.
- Sorting: name ascending by `display_name`, Next-due ascending by earliest enabled task, Site ascending by site name then display name.
- Overdue dot appears only when ≥1 enabled task's `next_due_at < startOfDay(now)` and no snooze hiding it.
- `npm test` adds ≥ 4 new tests; `npm run typecheck` + `npm run build` clean.

## Out of scope
- Plant Detail itself (Task 2-5 — we only link the route)
- Edit-pot and custom-schedule (Task 2-7)
- Pot delete (comes with Plant Detail / Task 2-7)
