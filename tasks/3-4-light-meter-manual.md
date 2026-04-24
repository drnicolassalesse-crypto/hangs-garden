# Task 3-4 — Light Meter (Manual)

## Goal
Deliver the "Light meter" shortcut from spec §5.12 as a manual picker. The actual AmbientLightSensor is not available on iOS Safari and is limited on Android; we focus on a small illustrated helper that lets the user pick the best light level for a spot. It can be opened as a modal from Add Plant Step 4 and from Edit Pot. If a browser exposes `AmbientLightSensor`, we show a live lux reading alongside the picker as a bonus.

## Scope
- `src/features/light-meter/LightMeterSheet.tsx` — modal sheet:
  - Title + "How to use" one-liner
  - Four large choice cards for Low / Medium / Bright indirect / Direct sun, each with a short rule-of-thumb:
    - Low: "A bathroom or hallway with no windows."
    - Medium: "A few meters from a window."
    - Bright indirect: "Right by a window, no direct sun on leaves."
    - Direct: "Sun hits the leaves for several hours."
  - If `'AmbientLightSensor' in window`, a panel that requests the sensor, reads lux, and maps to the 4 buckets (from spec §5.12 table). Otherwise hide the panel silently.
  - "Use this reading" closes the sheet and returns the selected `LightLevel` to the caller via a callback.
- `src/features/light-meter/lightMap.ts` — pure `luxToLevel(lux)` returning one of the four `LightLevel` values per spec §5.12 table; unit tested.
- `src/features/add-plant/steps/StepLightLocation.tsx` — add a "💡 Open light meter" link button near the light-level picker that opens the sheet and, on confirm, calls `onChange({ light_level })`.
- `src/features/plants/EditPotScreen.tsx` — same integration.
- Tests: `src/features/light-meter/__tests__/lightMap.test.ts` covers each range + boundaries.

## Acceptance criteria
- `luxToLevel(100) === 'low'`; `luxToLevel(1500) === 'medium'`; `luxToLevel(5000) === 'bright_indirect'`; `luxToLevel(12000) === 'direct_sunlight'`.
- Boundary rules: inclusive of the upper end of each bucket.
- The sheet opens from both Add Plant and Edit Pot; picking a level closes the sheet and updates the underlying draft.
- `npm test` ≥ 3 new tests; `npm run typecheck`, `npm run build` clean.

## Out of scope
- Lux averaging over time / UI gauge animation
- Camera-sensor-based lux (Android vendor APIs differ wildly; real sensor integration lands later if we add Capacitor)
