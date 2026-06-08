<!-- /autoplan restore point: /Users/jamesheffer/.gstack/projects/hefjam-kettlecal/claude-workout-app-planning-TxFZt-autoplan-restore-20260608-211350.md -->
# Kettlecal Coach Profile + Injury-Aware Logging

## Decisions
- Added a dedicated Coach tab while keeping Kit/Equipment separate.
- Default routine is calisthenics primary with kettlebell support.
- Default session length is `standard` with five generated slots; `short` has four and `long` has six.
- Today/Swap avoid KB press-family auto-picks by default: `kb-press`, `kb-double-press`, `kb-clean-press`, `kb-double-clean-press`.
- Freestyle remains permissive and still shows restricted movements when equipment allows them.
- Pain/RPE feedback is per exercise. Pain 4+ downranks exact exercises, pain 6+ avoids matching movement patterns when alternatives exist, and RPE 9+ holds progression.
- This is self-tracking and plan adaptation, not medical diagnosis or rehab guidance.

## Changed Areas
- Domain model: added coach profile, movement patterns, session length, and exercise feedback types.
- Exercise catalog: annotated all exercises with movement patterns.
- Generation engine: replaced emphasis-pool selection for the default profile with slot-based calisthenics + KB support selection.
- Progression engine: high-RPE logs hold targets instead of increasing reps, load, time, or ladder variation.
- UI: added Coach tab, feedback controls in workout logging, and Progress sections for movement balance and recent pain flags.
- Backup: schema v2 now includes `coach-profile`; v1 imports default the new profile.

## Verification
- `npm test` passes: 87 tests across 11 files.
- `npx tsc --noEmit` passes.
- `EXPO_OFFLINE=1 npx expo export --platform web` passes.

## Known Limitations
- Pain-pattern avoidance is based on recent completed sessions, not a user-managed cooldown calendar.
- Auto-adjust avoids painful movement patterns only when a non-matching slot alternative exists.
- EMOM stays out of automatic generation; swings come from regular swing exercises.
- Coach tab exposes the fixed calisthenics + KB support routine, not custom routine templates.

## Follow-Ups
- Manual routine template builder.
- Readiness check-in before generating Today.
- Richer trend charts for movement balance, pain, and RPE.
- Wearable import or external data sync.
- Clinician-grade rehab guidance if the app ever moves beyond self-tracking.

---

## GSTACK REVIEW REPORT

_Produced by `/autoplan` (full pipeline) on 2026-06-08. Reviewed: this log + the uncommitted working tree (17 files, +947). Dual voices: **Codex unavailable (binary not installed)** → `[subagent-only]`. Independent Claude reviewers ran for CEO, Design, and Eng; their findings are folded into the consensus tables below._

### Verdict

The deterministic engine is **solid, pure, and fail-safe**. Generation has no `Math.random`/`Date.now` (date is injected), every sort ends in an `id` tie-break, and a normal user with `DEFAULT_EQUIPMENT` (includes `bodyweight`) always gets a complete, stable 4–6 slot session that survives re-opens and regenerates on day-turnover ([index.tsx:43-50](<../app/(tabs)/index.tsx#L43-L50>)). Tests pass (87/87), `tsc` clean. **Tomorrow's workout is usable as-is.**

Every material finding is about the **pain-adaptation feature's trustworthiness**, not about whether the app can program a session. One cross-phase theme dominates.

### Cross-Phase Theme (flagged independently by all 3 voices) — HIGH-CONFIDENCE

**Pain adaptation is silent, on-by-default, and undisclosed.**
- `autoAdjust.enabled` defaults `true` ([types/index.ts:82](../src/types/index.ts#L82)).
- No in-app disclaimer anywhere — grep of `app/`, `src/components/`, `src/` returns zero. "Not medical guidance" lives only in this dev doc.
- Plan changes from pain are invisible: avoidance happens in candidate selection ([generateWorkout.ts:280-314](../src/engine/generateWorkout.ts#L280-L314)), never in a target's `reason`. The user sees exercises vanish with no narration and no undo.
- Over-reach: pain ≥6 on a `kb-snatch` (`['hinge','snatch','vertical_push','core']`, [exercises.ts:258](../src/data/exercises.ts#L258)) suppresses hinge + vertical-push + **core** across the plan, because broad tags (`core`, `full_body`) propagate into avoidance.
- When no alternative exists, the painful movement is silently re-included ([generateWorkout.ts:280-284](../src/engine/generateWorkout.ts#L280-L284)).

### CEO Dual Voices — Consensus

```
  Dimension                            Claude(primary)  Subagent  Consensus
  ──────────────────────────────────── ───────────────  ────────  ─────────
  1. Premises valid?                    mostly           mostly    CONFIRM (premise 2 flagged by user)
  2. Right problem to solve?            yes (kept)       partial   DISAGREE → taste: feature priority
  3. Scope calibration correct?        yes              over      DISAGREE → engine-heavy, UI-thin
  4. Alternatives explored?            partial          no        CONFIRM (flag-only alt unweighed)
  5. Competitive/market risk covered?  n/a (solo tool)  n/a       N/A
  6. 6-month trajectory sound?         yes w/ fixes     risky     CONFIRM (trust + dead code)
```
Codex voice: `[codex-unavailable]`.

### Design Litmus — Consensus (subagent-only + primary)

```
  Dimension                      Score   Note
  ─────────────────────────────  ─────   ─────────────────────────────────────
  Information hierarchy          6/10    Coach tab leads with non-interactive card; pain flags buried 4th
  Interaction-state coverage     4/10    Stepper fabricates 0/7 while storing undefined (CRITICAL)
  Empty states                   5/10    Empty plan = blank Today, no message; pain-flags empty copy misleading
  Accessibility                  4/10    Stepper 30×30 (<44/48), swap btn ~24px, text.muted ~2.5:1 (fails AA)
  User journey / acknowledgment  3/10    "Injury-aware coach" never tells the user it heard them
  AI-slop / specificity          7/10    Generic +/- stepper for the most domain-specific input
  Responsive/mobile              7/10    Fine; touch-target sizes are the real mobile risk
```
Mockups: `DESIGN_NOT_AVAILABLE` path + work is already built → reviewed live code, not mockups.

### Eng Dual Voices — Consensus

```
  Dimension                       Claude(primary)  Subagent  Consensus
  ──────────────────────────────  ───────────────  ────────  ─────────
  1. Architecture sound?          yes              yes       CONFIRM (pure engine, clean 1-way coupling)
  2. Test coverage sufficient?    no (gaps)        no        CONFIRM → add tests
  3. Performance risks?           none             none      CONFIRM (small in-memory data)
  4. Security threats?            none (offline)   none      CONFIRM
  5. Error paths handled?         mostly           mostly    CONFIRM (profile-shape validation gap)
  6. Determinism for "tomorrow"?  yes              yes       CONFIRM (byte-identical re-runs)
```
Codex voice: `[codex-unavailable]`.

### What Already Exists (leverage, don't rebuild)

A working deterministic coach pre-dated this feature: emphasis rotation, ladder promotion, swap, freestyle, backup. This PR replaced the default selection strategy (slot-based) and layered pain/RPE adaptation on top. Manual Swap already exists ([index.tsx:67-70](<../app/(tabs)/index.tsx#L67-L70>)) — the lightweight "flag-only, let the human swap" alternative is already 90% built.

### NOT In Scope (deferred — already in Follow-Ups)

- Manual routine/template builder; readiness check-in; richer trend charts; wearable sync; clinician-grade guidance. None are needed for tomorrow's workout.
- A real second `RoutineMode` (KB-primary) — defer; but **resolve the dead single-member union** (see tasks).

### Failure Modes Registry

| # | Failure | Trigger | Current behavior | Visible? | Fix |
|---|---------|---------|------------------|----------|-----|
| F1 | Silent pain avoidance | pain ≥6 logged | pattern removed 3 sessions, no narration | ❌ no | narrate in `reason` + Today notice + undo |
| F2 | Fabricated feedback | user never taps stepper | shows 0/7, stores undefined; a real 0 == "unset" | ❌ no | explicit unset placeholder |
| F3 | Blank Today | all equipment deselected | `targets:[]`, no Start, no message | ❌ no | empty-state UI |
| F4 | Engine crash on bad profile | partial profile imported/rehydrated | TypeError on `autoAdjust.enabled` | ❌ crash | deep-merge over `DEFAULT_COACH_PROFILE` |
| F5 | Over-broad avoidance | pain ≥6 on multi-pattern lift | unrelated core/full_body work removed | ❌ no | drop broad tags from avoidance |
| F6 | Stale plan on profile change | future caller forgets `clear()` | serves yesterday's plan | ❌ no | enforce invariant in store |
| F7 | No in-app disclaimer | any pain input | implies medical guidance | ❌ no | visible disclaimer |

### Test Diagram + Gap Plan (artifact: see `~/.gstack/projects/hefjam-kettlecal/`)

New branches → coverage:
- empty equipment → empty plan — **GAP**
- all-restricted → empty plan — **GAP**
- slot-pool exhaustion (BW-only long = 5, dup-free) — **GAP**
- `preferNonAvoided` total-avoidance fallback (pain on everything) — **GAP**
- `autoAdjust.enabled===false` disables downrank/avoid/hold — **GAP** (off-switch untested)
- `recentSessionWindow` boundary (session 4 ignored) — **GAP**
- Time/EMOM high-RPE hold — **GAP** (only KB+BW tested)
- `nextSwapTarget` empty/out-of-range/tiering — **GAP**
- backup with partial coach profile — **GAP**
- `computePatternBalance`/`recentPainFlags` units — **GAP**
- Covered: standard plan, lengths, EMOM exclusion, determinism, pain-4 downrank, pain-6 avoid, swap-respects-restrictions, KB/BW hold, v2 round-trip, v1→v2 migration, freestyle keeps restricted, coach toggles.

### Decision Audit Trail

| # | Phase | Decision | Class | Principle | Rationale |
|---|-------|----------|-------|-----------|-----------|
| 1 | CEO | Keep feature (don't scrap for "wrong problem") | Mechanical | P6 | User built it + chose full review; engine is good |
| 2 | CEO | In-app safety disclaimer = required | Mechanical | P1 | Safety; "not medical" must be in-product |
| 3 | CEO | Keep press-family default-off; add caption | Mechanical | P3 | Deliberate shoulder-protective choice |
| 4 | CEO | Pain auto-adjust trust model | **Taste** | — | User flagged; reasonable people differ → GATE |
| 5 | Design | Fix stepper unset state | Mechanical | P1 | Data integrity |
| 6 | Design | Narrate pain-driven plan changes + undo | Mechanical | P1 | Closes the trust loop |
| 7 | Design | Stepper 44×44 / hitSlop | Mechanical | P1 | Accessibility floor |
| 8 | Design | Move feedback below set logger | Mechanical | P5 | Matches mid-set task order |
| 9 | Eng | Empty-plan empty state | Mechanical | P1 | No dead-end blank screen |
| 10 | Eng | Deep-merge profile over defaults (import+rehydrate) | Mechanical | P1 | Prevents engine crash |
| 11 | Eng | Scope avoidance to primary patterns (drop core/full_body) | Mechanical | P5 | Stops surprise removals |
| 12 | Eng | Add the 10 test gaps | Mechanical | P1 | "Well-tested is non-negotiable" |
| 13 | Eng/CEO | Dead second RoutineMode | **Taste** | — | Delete vs wire real mode → GATE |

### Prioritized Implementation Tasks (for the /loop)

**P1 — trust + safety + data integrity (small, surgical):**
- [ ] T1 Add a visible in-app disclaimer next to pain input + on the Coach auto-adjust toggle ("self-tracking, not medical advice; persistent pain → see a clinician"). _src: ExerciseCard, coach.tsx_
- [ ] T2 Stepper: show "—/Tap to rate" until first interaction; distinguish unset from a real 0. _src: ExerciseCard.tsx:135-167_
- [ ] T3 Narrate pain-driven changes: when a target/slot is downranked/avoided, say so in the card `reason` and/or a Today notice; make it undoable. _src: generateWorkout.ts, index.tsx_
- [ ] T4 Resolve the pain auto-adjust trust model per the gate decision (D5).

**P2 — correctness + a11y + robustness:**
- [ ] T5 Empty-plan empty state on Today (no exercises → "check Equipment"). _index.tsx:122_
- [ ] T6 Deep-merge imported/rehydrated coach profile over `DEFAULT_COACH_PROFILE`; add `version`/`migrate` to `useCoachProfile`. _backup.ts:129-134, useCoachProfile.ts_
- [ ] T7 Scope pain avoidance to primary patterns; exclude `core`/`full_body`. _generateWorkout.ts:270-273_
- [ ] T8 Stepper touch targets → 44×44 or `hitSlop`; swap button ≥44. _ExerciseCard.tsx:243, index.tsx:180_
- [ ] T9 Fix contrast: `text.muted` empty-state copy fails AA (~2.5:1). _progress.tsx, theme/colors_
- [ ] T10 Move FeedbackControls below the set logger. _ExerciseCard.tsx:65_
- [ ] T11 Add the 10 test gaps (empty/all-restricted, off-switch, window boundary, time/emom hold, swap tiers, partial-profile import, progress units).

**P3 — polish:**
- [ ] T12 Confirmation/toast on Coach setting changes. _coach.tsx:28-39_
- [ ] T13 Reorder + card-wrap "Recent Pain Flags" on Progress; link flag → plan change. _progress.tsx:98-116_
- [ ] T14 Delete the dead `chooseEmphasisWorkout` branch + single-member union, OR wire a real second mode (gate D13).
- [ ] T15 High-RPE hold: don't prescribe more reps than performed when `best < repMin`. _progression.ts:134,230_

### Post-Review Changes Landed (autoplan loop, 2026-06-08)

Decision at gate: **pain auto-adjust is now opt-in (default OFF) + disclaimer.** Verified: `npm test` 94/94 (was 87, +7 gap tests), `tsc` clean, `EXPO_OFFLINE=1 npx expo export --platform web` clean, and a probe confirms a complete deterministic session for 2026-06-09.

Landed:
- **T4/default**: `DEFAULT_COACH_PROFILE.autoAdjust.enabled = false` — no silent adaptation out of the box; pain/RPE still logs. ([types/index.ts](../src/types/index.ts))
- **T1 disclaimer**: "Self-tracking, not medical advice" by the pain/RPE input and on the Coach auto-adjust toggle (reframed "Off by default"). ([ExerciseCard.tsx](../src/components/ExerciseCard.tsx), [coach.tsx](<../app/(tabs)/coach.tsx>))
- **T2 stepper unset**: shows "–" until first tap; a real 0 is now distinct from "not rated". ([ExerciseCard.tsx](../src/components/ExerciseCard.tsx))
- **T8/T10 a11y + order**: stepper 36×36 + hitSlop (≈52 touch area); feedback moved below the set logger. ([ExerciseCard.tsx](../src/components/ExerciseCard.tsx))
- **T5 empty state**: Today shows a "no exercises — check Kit / loosen Coach" card instead of a blank screen. ([index.tsx](<../app/(tabs)/index.tsx>))
- **T6 profile robustness**: `mergeCoachProfile()` deep-merges over defaults on backup import + store rehydrate (persist `version:1` + `merge`); a partial profile can no longer crash the engine. ([types/index.ts](../src/types/index.ts), [backup.ts](../src/data/backup.ts), [useCoachProfile.ts](../src/stores/useCoachProfile.ts))
- **T7 avoidance scoping**: `core`/`full_body` excluded from pattern avoidance — one painful snatch no longer strips unrelated core work. ([generateWorkout.ts](../src/engine/generateWorkout.ts))
- **T9 contrast + copy**: empty-state text moved off the AA-failing `text.muted`; pain-flags empty copy now reflects opt-in. ([progress.tsx](<../app/(tabs)/progress.tsx>))
- **T11 tests**: +7 — default-OFF, off-switch (pain ignored when disabled), empty-equipment, all-restricted, total-avoidance fallback, broad-pattern keeps core, partial-profile import merge.

Deferred (not needed for a trustworthy session tomorrow): T3 narrate+undo of pain changes (that was the "keep ON" path), T12 Coach-change toast, T13 Progress reorder of pain flags, T14 dead `chooseEmphasisWorkout` cleanup, T15 high-RPE hold-reps edge.

