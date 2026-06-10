# Kettlecal — Agent Handoff
_Written 2026-06-10 for Codex (or any cold-start agent). Everything verified against the tree on this date. Read this fully before touching code._

## ⚠️ First, the working tree

`main` is **dirty with verified, signed-off, UNCOMMITTED work** — it is the only copy. Do not stash, revert, or rebuild any of it. The immediate task (S1 below) is to commit it in two commits:

1. `ui:` — visual restyle: all of `app/`, `src/components/` (incl. new `SynthCard.tsx`), `src/theme/`, plus `package.json`/`package-lock.json`.
2. `feat(catalog): v3` — `src/types/index.ts`, `src/data/{exercises,ladders}.ts` + tests, `src/engine/generateWorkout*.ts`, `src/engine/progression.test.ts`, `src/stores/useCoachProfile.ts`, the two-line label additions in `app/(tabs)/progress.tsx`, `OVERHEAD_FAMILY` in `app/(tabs)/coach.tsx`, and `docs/*.md` (new docs).

Note the overlap: `coach.tsx` and `progress.tsx` carry both restyle and catalog changes; if splitting is more trouble than it's worth, one combined commit is acceptable — James prioritises the work being pushed over commit aesthetics. Verified state of the full dirty tree: **116/116 tests, `tsc --noEmit` clean.**

## Product

Offline-first calisthenics + kettlebell workout tracker with a deterministic coach (Expo SDK 56 / React Native 0.85 / expo-router / Zustand + MMKV / vitest). Owner: James Heffer (Hefjam/Kettlecal on GitHub). Single user for now — James himself; his equipment: pull-up bar, dip bars, rings, bands, 1×20kg + 2×24kg kettlebells.

## Architecture map

- `src/engine/` — **pure, deterministic coach**. `generateWorkout.ts` (slot-based selection, per-emphasis priorities), `progression.ts` (double progression, ladder promotion, deload, EMOM), `progressionConfig.ts` (all tuning knobs, one place).
- `src/data/` — `exercises.ts` (catalog, 43 entries), `ladders.ts` (progression chains), `availability.ts` (equipment semantics), `freestyle.ts`, `backup.ts` (JSON export/import, schema v2), each with tests. `exercises.test.ts` is the catalog-integrity suite — it enforces the tagging rules in the `exercises.ts` header.
- `src/stores/` — Zustand stores persisted to MMKV (`mmkvStorage.web.ts` = browser fallback). `useActiveSession` persists mid-workout state; relaunch shows a resume prompt. `useCoachProfile` is at persisted **version 2** with a migration.
- `app/` — expo-router screens: tabs (Today/index, coach, equipment, history, progress) + `workout/` + `freestyle`.
- `docs/` — `review-2026-06-09.md` (full progress review), `exercise-db-audit-2026-06-10.md` (catalog audit + what landed), `wave-plan-2026-06-10.md` (**the current PRD — your work queue**), `implementation-log.md` (coach feature history + a prior deep review).

## Invariants — do not break these

1. **Engine purity**: no `Math.random`, no `Date.now` inside `src/engine/` — the date is injected (`dayKey()` default param). Every sort ends in an `id` tie-break. Same inputs → byte-identical plan. There are tests for this; keep them green.
2. **Safety posture**: `autoAdjust.enabled` defaults `false`; ALL overhead KB work (presses, snatch, get-up, windmill) is in `restrictedAutoPickExerciseIds` by default; "not medical advice" disclaimers exist in `ExerciseCard.tsx` and `coach.tsx`. None of this may regress silently — these were explicit owner decisions (2026-06-08 and 2026-06-10).
3. **Persisted-store discipline**: any shape change to a persisted store ⇒ bump `version` + write a `migrate`. `mergeCoachProfile()` must keep guarding rehydration (a partial profile once crashed the engine).
4. **Catalog tagging rules** live in the `exercises.ts` header and are enforced by `exercises.test.ts` (core-pattern⇒core-muscle, accessories never in main slots, slot pools ≥2 deep, ladder integrity). Add exercises by following them, not by weakening the tests.
5. **Equipment semantics**: an exercise's `equipment` array is **ANY-of alternatives**. Known latent gap (F7): double-KB lifts can't express "needs 2 bells" — quantity exists in `UserEquipment` but isn't checked. Don't "fix" this in passing without a test and a note.
6. **Units**: kg/grams everywhere. Never imperial.

## Verification

`npm test` (vitest, currently 116 passing) · `npx tsc --noEmit` · `EXPO_OFFLINE=1 npx expo export --platform web`. CI (`.github/workflows/ci.yml`) runs all three on push/PR to main and deploys `dist/` to GitHub Pages. One-time manual step possibly outstanding: repo Settings → Pages → source = `gh-pages` branch.

## Work queue — follow `docs/wave-plan-2026-06-10.md`

Wave goal (signed off): **daily driver on James's Android phone**. iOS is out of scope. Web (auto-deployed) is the interim version only — browser storage is evictable; real training history lives in the APK build.

S1 commit+push (see top) → S2 EAS Android: add `android.package`, create `eas.json` with `development` + `preview` (APK) profiles, one cloud build, sideload (needs James present for the Expo account) → S3 on-device shakedown — the checklist is in the wave plan; **the locked-screen rest-timer behaviour is the #1 unknown**, never tested on hardware → S4–S5 field use + tuning.

Explicitly deferred — do not pull in: T3 pain-narration (gated on the end-of-wave autoAdjust decision), recovery-based rotation, readiness check-in, templates, trend charts, wearables, expo-av migration (unless the device beep breaks), F7, component test suite (exception: if you touch `SetLogger`, add the log-a-set interaction test in the same commit).

## Gotchas

- **MMKV v4 ⇒ Expo Go cannot run this app.** Native testing requires a dev/preview build. Web (`npx expo start --web`) works for UI iteration.
- `node_modules` copied across OSes breaks rollup/esbuild native binaries (`Cannot find module @rollup/rollup-<platform>`); fix with a platform-matched `npm i <pkg> --no-save --force`, or just `npm ci` fresh. CI is unaffected.
- `app.json` sets `baseUrl: /Kettlecal` for Pages — don't remove it when touching web config.
- Several screens were restyled in the uncommitted work; verify against the dirty tree, not `HEAD`, until S1 lands.
- `expo-av` is used only for the EMOM beep and is on a deprecation path; the repo's own `CLAUDE.md` mandates reading the SDK 56 docs before any Expo API work.

## Working with James

PRD before building anything non-trivial; get explicit sign-off. He is financially exposed to his work tools being right — **never approximate numbers, show working, flag assumptions**. Before anything destructive or irreversible (force-push, deletion, data migration on his device): show the plan and wait for an explicit "proceed". Check `docs/` and recent commits for prior work before proposing anything — multiple agents work this repo and re-invention has been the historical failure mode. Update `TODOS.md` and the relevant doc in `docs/` when state changes; stale docs actively mislead the next session.
