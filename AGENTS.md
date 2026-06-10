# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Rules for this codebase

- Run tests: `npx vitest run` (94 tests across 11 files — all must pass)
- Type check: `npx tsc --noEmit`
- The engine (`src/engine/`) is pure and deterministic — never introduce `Date.now()` or `Math.random()` there; use injected parameters instead
- All colors must go through `src/theme/colors.ts` — no hardcoded hex anywhere
- Stores: 5 persisted stores use MMKV (`src/stores/mmkvStorage.ts`); `useActiveSession` is the exception (ephemeral by design currently)
- Safety: `autoAdjust` defaults OFF; do not flip it on; disclaimers in `ExerciseCard` and `coach.tsx` must survive any restyle
