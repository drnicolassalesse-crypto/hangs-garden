# Task 2-1 — Onboarding & Local Profile

## Goal
First-launch onboarding flow that captures the user's display name and preferences and stores them as a local profile in Dexie. Replaces spec §2 Auth (no email/password, no Google/Apple) with a single on-device profile, per the plan's PWA adaptation.

After onboarding, the user lands on the placeholder home (later replaced by Today). On every subsequent launch the onboarding is skipped and the user goes straight in.

## Scope
- `src/state/profileStore.ts` — Zustand store: `{ profile, status: 'loading'|'ready', load(), save(input) }`
- `src/ui/Button.tsx`, `src/ui/Field.tsx` — minimal primitives (single file each); no full design system yet
- `src/features/onboarding/OnboardingFlow.tsx` — 4-step in-page flow (no router nav between steps; local index state)
  1. **Welcome** — "Planta" header, one-paragraph pitch, Get Started button
  2. **Your name** — text input (display name), Continue
  3. **Skill level** — three radio cards: Beginner / Intermediate / Expert (spec §2.2)
  4. **Notification frequency** — three radio cards: Minimal / Moderate / Frequent (spec §2.3) + Save
- `src/features/onboarding/OnboardingGate.tsx` — wraps the app: while profile loads, render nothing; if profile null, render `OnboardingFlow`; otherwise render children
- `src/App.tsx` — wrap routes in `OnboardingGate`
- `src/features/onboarding/__tests__/onboardingStore.test.ts` — load/save behaviour against fake-indexeddb

## Behaviour rules
- Display name: required, trimmed, ≤ 40 chars; "Continue" disabled until valid.
- Default skill level: `beginner`. Default notification frequency: `moderate`. Default `reminder_time`: `08:00`.
- `save()` upserts via `profileRepo.upsert` and updates store state in one round-trip.
- The notification permission is **not** requested here — that lives in Task 3-1 (notifications). We just store the preference now.

## Acceptance criteria
- Fresh DB: app renders the onboarding flow.
- Submitting the flow stores a row in `profile`, dismisses the flow, and shows the home placeholder.
- Reload: profile is loaded from Dexie within first paint and onboarding does NOT reappear.
- `npm test` includes a store test that exercises `load → save → load` and asserts the round-trip.
- `npm run typecheck` and `npm run build` pass.

## Out of scope
- Avatar upload (later)
- Editing the profile from Settings (Task 3-3)
- Notification permission prompt (Task 3-1)
- "Add first plant" Step 5 from spec §5.2 — we link to `/species` for now; real Add Plant flow lands in Task 2-2.
