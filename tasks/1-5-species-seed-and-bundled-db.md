# Task 1-5 — Species Seed (Vietnam-tuned) & First-Launch Seeder

## Goal
Ship a bundled, on-device species database curated for users in **Vietnam** (tropical/subtropical climate, year-round growing, popular Tết and culinary plants). Seed runs once on first launch when the local DB is empty; updates on later app versions are merged via `bulkUpsert`.

The seed is the only data source for the Add Plant flow until/unless a future version adds a download or community contribution path.

## Vietnam tuning principles
- Default watering intervals assume **higher humidity + heat** than a temperate baseline. Tropicals tend toward 5–7 days, herbs 2–4 days, succulents/cacti 14–21 days. The schedule engine still adjusts for pot/light/location at the per-pot level.
- Common names default to **English** (the universal field) but each record carries the **Vietnamese name** in `description` and a `vi_name` tag, so search by either works.
- Includes Tết-tradition plants (mai vàng, quất, đào), Vietnamese culinary herbs (rau răm, sả, tía tô, ngò gai, húng quế), and the houseplants most commonly sold in Vietnamese garden centres (lưỡi hổ, kim tiền, kim ngân, trầu bà, lan, sứ).

## Scope
- `src/data/species/seed.json` — 30 species with full `PlantSpecies` shape
- `src/data/seeders.ts` — `seedIfEmpty()` runs on app boot; merges by id when the seed version increases
- `src/main.tsx` — call `seedIfEmpty()` once, before initial render's first data query (await before mounting React or kick off and let UI react via state)
- `src/App.tsx` — temporary smoke display: show "{N} species available" on the placeholder home so we can eyeball that the seed loaded
- `src/data/__tests__/seeders.test.ts` — first-launch path inserts everything; second launch is a no-op

## Acceptance criteria
- Fresh app → `speciesRepo.count()` returns 30 after first load.
- Re-load → still 30 (no duplicates).
- Bumping `SEED_VERSION` re-merges any changed records (idempotent for unchanged ones).
- `npm test`, `npm run typecheck`, `npm run build` all pass.

## Out of scope
- Per-skill-level care instructions (spec §7.2) — the `description` field carries a one-paragraph summary for now. Detailed instructions are loaded later (Task 2-5 / future task).
- Real species photos — `image_url` is null for all entries; UI uses a fallback illustration.
- Full 100+ species DB — 30 is enough for MVP; expand later via a follow-up task.
