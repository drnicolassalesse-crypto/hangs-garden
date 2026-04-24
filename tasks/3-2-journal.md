# Task 3-2 — Journal Composer

## Goal
Replace the Journal tab's placeholder "+ Add entry" alert with a real composer. Lets the user capture a dated note with up to 5 photos and preset tags (spec §5.13). Photos persist as Blobs via `imagesRepo`; entries land in `journal_entries` and re-render immediately.

## Scope
- `src/features/journal/JournalComposer.tsx` — sheet-style modal:
  - Textarea (plain text; no rich formatting for MVP)
  - Photo attachments via `<input type="file" accept="image/*" multiple>` up to 5, each rendered as a thumbnail with a remove button; stored by `imagesRepo.put`
  - Tag selector (checkboxes): `new_growth`, `repotted`, `pest_spotted`, `pruned`, `blooming`, `wilting`, `other`
  - Date picker (defaults to today, backdateable)
  - Save / Discard buttons
- `src/features/plants/tabs/JournalTab.tsx` — render entries with thumbnails loaded from `imagesRepo`; + Add entry opens the composer; Edit/Delete per-entry via long-press menu replaced with a simple kebab button (3-dot) exposing Delete.
- `src/features/journal/actions.ts` — `createEntry(potId, input)`, `deleteEntry(entryId)` — thin wrappers; the composer handles image upload and cleanup on Discard.
- Tests: `src/features/journal/__tests__/journalFlow.test.ts` — create with 2 photos → entry appears with 2 blob ids; delete entry → entry gone; discarding a draft that had uploaded blobs cleans them up.

## UX
- Tag chips are multi-select pills (filled when selected).
- Entry card in JournalTab shows: date, first 160 chars of text, tag pills, first thumbnail (click to expand is future work — for MVP we just render inline).
- Photo thumbnails in the composer are 64px square tiles; tapping a tile opens the native file picker to replace.

## Acceptance criteria
- Adding an entry with text + 2 photos + 2 tags creates a row with matching `photo_blob_ids` and `tags`.
- The composer's Discard button removes any uploaded photos that aren't referenced elsewhere.
- Deleting an entry removes the entry row and, as a best-effort, the images it exclusively owned (we delete blobs that aren't referenced by any pot photo or other entry — tracked via a simple `collectOrphans` helper since only two tables reference image ids).
- `npm test` passes with ≥ 3 new tests; `npm run typecheck` and `npm run build` clean.

## Out of scope
- Rich text / markdown (plain text only for MVP)
- Image compression / resizing (accept original Blob)
- Full-screen lightbox for photos (later polish)
