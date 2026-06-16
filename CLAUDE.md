# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start              # dev server — choose iOS/Android/web from the menu
npx expo start --ios
npx expo start --android
npx vitest run              # all tests — must stay green (94 tests, 11 files)
npx vitest                  # watch mode
npx tsc --noEmit            # type check
npx expo export --platform web   # web export (also what CI runs)
```

Read versioned Expo docs at https://docs.expo.dev/versions/v56.0.0/ before touching Expo APIs. SDK 56 is a breaking release and the online docs differ from training data.

## Architecture

The codebase has three distinct layers that must stay clean:

```
app/              Expo Router screens (UI + wiring)
src/engine/       Pure coach logic (no RN, no side effects)
src/stores/       Zustand state + MMKV persistence
src/data/         Static exercise catalog, ladders, backup helpers
src/theme/        Colors, typography, icon theme
src/types/        Shared domain types
```

### Engine (`src/engine/`)

The engine is pure and deterministic — same inputs produce identical output. **Never introduce `Date.now()`, `Math.random()`, or I/O here.** All wall-clock or random values must be injected as parameters.

- **`generateWorkout.ts`** — Plans today's session. Selection is staleness-ordered (least-recently-trained first, tie-break by `id`), so exercise rotation is deterministic and re-opens within a day produce the same plan. `nextSwapTarget` handles per-card swaps on the today screen.
- **`progression.ts`** — `buildTarget` computes one exercise's target from its last log. Double-progression scheme: increase reps up to a ceiling, then jump weight (KB) or promote up the ladder (bodyweight). Auto-deload: three consecutive stall sessions triggers a weight drop or rep back-off. RPE hold: if `autoAdjust.enabled` and last session RPE ≥ threshold, repeat the same target rather than advancing.
- **`progressionConfig.ts`** — All tuning knobs in one constant (`PROGRESSION`). KB: 5 sets, 5–8 reps. Bodyweight: 4 sets, 6–12 reps. Time: 3 sets, 15s start, +5s/session. EMOM: double-progression on reps/min then minutes. Deload: 3-stall trigger, −2 rep drop.
- **`history.ts`** — Query helpers over `WorkoutSession[]`.

### Rotation + Today plan (stores)

Emphasis cycles through `strength → skill → conditioning` in that fixed order. `useRotation` stores `lastEmphasis` and only advances it when a **coached** session completes — a skipped day does not "catch up". `useTodayPlan` generates once per local day (keyed by `dayKey()`) and persists the plan so per-card swaps survive backgrounding. The plan is cleared when the coached session completes.

Freestyle sessions do **not** advance the rotation.

### Stores (`src/stores/`)

Five stores are persisted to MMKV: `useWorkoutHistory`, `useCoachProfile`, `useEquipment`, `useRotation`, `useTodayPlan`. `useActiveSession` is also MMKV-persisted (for resume-after-kill), but is designed to be ephemeral — it clears completely on workout completion or abandonment.

MMKV platform split: `mmkvStorage.ts` (native) and `mmkvStorage.web.ts` (browser localStorage shim). The web shim uses evictable storage — the web build is not the daily driver for real training data.

### Exercise catalog and ladders (`src/data/`)

`exercises.ts` — the static catalog. `availability.ts` — equipment guards. `ladders.ts` — ordered progression chains (easy → hard). When a user maxes the rep ceiling and has no heavier KB, `nextRung` promotes them to the next ladder rung if they own the required gear; otherwise falls back to volume creep. Movements with no unambiguous next-harder variation are intentionally left standalone. EMOM exercises are excluded from auto-selection in the coach (they're always opt-in).

### Slots and emphasis

`slotsForSessionLength` returns 4 (short), 5 (standard), or 6 (long) workout slots. Slots only accept `tier: 'main'` exercises — accessories (`tier: 'accessory'`) can't win a main slot on staleness alone; they're only pickable in the conditioning/accessory slot and Freestyle. Each slot carries per-emphasis priority lists, so a conditioning day leads with swings while a strength day leads with heavy KB work.

## Hard invariants

- **Engine purity** — no `Date.now()`, `Math.random()`, or any side effects in `src/engine/`. Inject everything.
- **Colors** — all color values go through `src/theme/colors.ts`. No hardcoded hex anywhere else.
- **`autoAdjust` stays OFF** — `DEFAULT_COACH_PROFILE.autoAdjust.enabled` is `false`. Do not flip it; the decision to enable it is gated on field-use results.
- **Safety disclaimers** — the disclaimer copy in `ExerciseCard.tsx` and `app/(tabs)/coach.tsx` must survive any restyle.
- **Overhead restriction** — `DEFAULT_COACH_PROFILE.restrictedAutoPickExerciseIds` gates all overhead work (presses, snatch, get-up, windmill) as opt-in via the Coach tab. This is a safety-first default; do not remove exercises from this list.
- **`mergeCoachProfile`** — any coach profile arriving from backup or an older build must be passed through `mergeCoachProfile` (in `src/types/index.ts`) before reaching the engine. Nested `autoAdjust` fields are read unconditionally and would crash without this merge.

## CI / Deploy

GitHub Actions (`.github/workflows/ci.yml`): on push/PR to `main` — `tsc --noEmit` + `vitest run` + `expo export --platform web`. On merge to `main` — deploys web export to GitHub Pages. The Pages deploy copies `index.html` → `404.html` as an SPA fallback for deep-link reloads (e.g. `/workout` on refresh).

EAS builds: `eas.json` has `development` (dev client, APK) and `preview` (standalone APK, the daily-driver build) profiles. Android only for this wave; iOS deferred. Sideload via `adb`.
