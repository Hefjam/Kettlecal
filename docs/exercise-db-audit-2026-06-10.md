# Exercise Database Audit — Tagging, Gaps, Proposed Additions
_2026-06-10 · Audited: all 32 entries in `src/data/exercises.ts` against `MovementPattern`, slot matchers in `generateWorkout.ts`, `LADDERS`, `availability.ts` semantics, and the Progress pattern-balance view. **No code changed — everything below is for sign-off.**_

## How the tags actually get consumed (read this first)

Three consumers, three different stakes:

1. **Slot matchers** select by `category` + `movementPatterns` (+ `emphasis` for two slots). A wrong pattern puts an exercise in the wrong slot pool.
2. **Pain avoidance** (when autoAdjust is on) avoids by `movementPatterns` (minus `core`/`full_body`). A wrong pattern means pain on one lift wrongly suppresses — or fails to suppress — another.
3. **Progress → movement balance** counts *sets per pattern over 7 days*. Inconsistent tagging directly skews the chart you'd use to judge balance.

`muscleGroups` is currently consumed by **nothing** except display — and it's `string[]`, untyped, which is why drift has crept in unnoticed (see F1/F2).

## Part 1 — Per-entry tagging audit

29 of 32 entries are tagged sensibly. The findings:

| # | Finding | Entries | Severity | Detail |
|---|---------|---------|----------|--------|
| F1 | Muscle-group string drift | `band-pull-apart` | Low | Only entry using `'upper-back'`; everything else says `'back'`. Untyped `string[]` means tsc can't catch this. |
| F2 | `'full-body'` as a muscle group | `kb-clean-press`, `kb-double-clean-press`, `kb-turkish-getup` | Low | Tells any future muscle-based view nothing. Should be granular (`glutes, hamstrings, shoulders, triceps, core`). Note the hyphen/underscore split: muscle `'full-body'` vs pattern `'full_body'`. |
| F3 | Inconsistent `core` pattern rule | `kb-swing` vs `kb-press` | **Medium** | Swing has `core` in muscles but **not** patterns; press has it in both. There's no stated rule for when core is a *pattern*. Since the balance chart counts patterns, your weekly core number currently depends on which lifts you happened to do, not how much core work you did. Proposed rule: `core` is a pattern only where anti-flexion/anti-rotation is a *limiting factor* (single-bell overhead, ring instability, getup, dedicated core moves) — ballistic hinges stay out. Current tags already roughly follow this; document it in the file header and it becomes auditable. |
| F4 | `muscle-up` tags | `muscle-up` | Low | Missing `shoulders` in muscles; `full_body` pattern is a stretch for a 2-pattern gymnastic movement (it exists mainly to inflate the balance chart). Suggest drop. |
| F5 | **Overhead policy inconsistency** | `kb-snatch`, `kb-turkish-getup` | **High — decision needed** | The press family is in `restrictedAutoPickExerciseIds` (deliberate shoulder-protective default), yet **kb-snatch — ballistic overhead — is freely auto-pickable** via the KB-support/KB-hinge slots (it carries `hinge`), and the getup (overhead throughout) is pickable via core-skill. If the restriction is "shoulder caution", snatch is *more* aggressive than a strict press, not less. Either: (a) add snatch + getup to the default restricted list, or (b) document that the restriction targets *grinding* presses specifically and ballistic/loaded-carry overhead is intentionally allowed. Both defensible — but right now it's unstated and looks accidental. |
| F6 | **Accessory hijacks the Pull slot** | `band-pull-apart` | **High** | It matches the Pull slot (`calisthenics` + `horizontal_pull`). Selection order is safety → **recency** → slot priority → emphasis. So once you've trained pull-ups recently and never logged band pull-aparts, the *never-trained accessory wins the main pull slot* — your pull work for the day becomes a band pull-apart. Same staleness logic that nicely rotates variety promotes the easiest prehab move to a main slot. It's also priority #1 in the conditioning slot, so it's double-weighted catalog-wide. Fix options: (a) add a `tier: 'main' \| 'accessory'` field and have main slots require `tier: 'main'` (schema change, cleanest); (b) retag it off `horizontal_pull` to a new accessory-ish pattern (abuses pattern semantics); (c) exclude it by id in the pull matcher (hacky). I recommend (a). |
| F7 | Double-KB lifts can't express "needs 2 bells" | `kb-double-*` (5 entries) | Low (latent) | `equipment` is ANY-of alternatives and `ownsKettlebell` checks `quantity > 0` — owning **one** 24 makes all double lifts "available". You own 2×24 so it never bites you, but the schema has `quantity` and the catalog can't use it. `availability.ts` even has a comment anticipating this. Cheap fix when touched next: `requiredKbCount?: number` on Exercise, checked in `ownsItem`. |
| F8 | `muscleGroups: string[]` untyped | schema | Medium | Root cause of F1/F2. A `MuscleGroup` union (like `MovementPattern`) makes every future drift a compile error. ~10-line change + fixing whatever it flags. |

Also verified, no action: `l-sit` equipment alternatives (dip-bars OR rings) are correct under ANY-of semantics; ladder membership is consistent with tags; EMOM exclusion from auto-pick is intact; the press-family restriction strings match catalog ids exactly.

## Part 2 — Coverage gaps and balance

### Pattern coverage (auto-pickable under the default profile, full equipment)

| Pattern | Depth | Assessment |
|---------|-------|------------|
| vertical_pull | 4 | Good |
| horizontal_pull | 3 | OK (one is the F6 accessory) |
| horizontal_push | 2 | Thin but dips compensate |
| dip | 3 | Good |
| vertical_push | 3 pickable (pike, snatch, getup) of 7 | Fine *if* F5 resolves to "ballistic allowed" |
| squat | 5 | Good, but see ladder-jump gap below |
| hinge | 8 | Deep — **but 100% kettlebell** |
| core | ~13 | Deep, all anterior/hanging — zero lateral |
| **lunge / unilateral knee** | **0 — pattern doesn't exist** | Biggest structural hole |
| **carry** | **0 — pattern doesn't exist** | Second biggest; carries are *the* canonical KB accessory |
| rotation / lateral core | 0 distinct | All core is one undifferentiated bucket |

### Slot pool depths (the generator's actual constraint)

Pull 6 · Push 5 · KB-support 6 · KB-hinge 5 · Core-skill ~16 · Conditioning ~9 — all healthy. **Except: the long-session `kb-row` slot has a pool of exactly 1** (`kb-row` itself). Every long session prescribes the same row forever; if it's ever pain-downranked there is no alternative and the slot silently falls to filler. One added row variation fixes this.

### Ladder-jump gap

`squat → pistol-squat` is the only two-rung ladder with a chasm in it — that jump is months of unguided work with no intermediate rung, while the push ladder has four graded rungs. You own rings: a ring-assisted pistol is the natural missing rung.

### The emphasis system is nearly cosmetic — decision needed

Traced through `compareCandidates`: emphasis fit is the **4th** tie-break, behind safety, recency, and slot priority. Cold start (no history), the standard session is **pull-up, push-up, kb-row, hollow-body, band-pull-apart on all three focus days** — identical plan whether today is "strength", "skill" or "conditioning", because the priority lists decide first. With history, recency decides first instead. Emphasis only ever influences picks when recency ties *and* both candidates are off the slot's priority list — rare. So the strength/skill/conditioning rotation currently changes the day's *label* and the swap pool, not the workout.

Options (genuinely your call — this is the "workout focus" design):
- **(a) Make focus real**: per-emphasis slot priority lists (strength day: `dip` over `push-up`, `kb-rdl` over `kb-swing`; conditioning day: reverse). Deterministic, no reordering of the comparator needed, ~30 lines. My recommendation.
- **(b) Promote emphasis fit above slot priority** in the comparator — blunter, risks fighting the staleness rotation.
- **(c) Accept it as a label** and delete the pretense — honest, but you lose the periodization the rotation promises.

## Part 3 — Proposed additions (for your sign-off)

Chosen to fix the holes above using **only equipment you own**. Ready-to-paste entries on approval; none touch the engine except the two new `MovementPattern` members (`'lunge'`, `'carry'`), which flow automatically into slots-by-pattern, avoidance, and the balance chart.

**Tier 1 — fixes a structural gap (7):**

| Id | Type | Patterns | Emphasis | Fixes |
|----|------|----------|----------|-------|
| `kb-farmer-carry` (2×24) | time | carry, core | conditioning, strength | No carry pattern; grip/trap work absent |
| `kb-suitcase-carry` (20 or 24) | time | carry, core | conditioning | Anti-lateral-flexion core — currently zero |
| `kb-reverse-lunge` (goblet, 20/24) | reps | lunge | strength | No unilateral knee work at all |
| `split-squat` (bodyweight) | reps | lunge | conditioning, strength | Bodyweight lunge entry; ladder base |
| `ring-assisted-pistol` (rings) | reps | squat | skill | The missing rung: `squat → ring-assisted-pistol → pistol-squat` |
| `glute-bridge` (bodyweight) | reps | hinge | conditioning | Hinge is currently 100% KB; gives a hinge that survives equipment-off days |
| `kb-double-row` (2×24) | reps | row, horizontal_pull | strength | kb-row slot pool of 1; adds ladder `kb-row → kb-double-row` |

**Tier 2 — quality, take or leave (4):**

| Id | Type | Patterns | Emphasis | Rationale |
|----|------|----------|----------|-----------|
| `side-plank` | time | core | conditioning | Lateral core for the bodyweight side; pairs with suitcase carry |
| `band-face-pull` | reps | horizontal_pull | conditioning | Shoulder-health accessory, consistent with your press-cautious default; should be `tier: accessory` like band-pull-apart if F6(a) is adopted |
| `hanging-leg-raise` | reps | core | skill, conditioning | Bridges the `hanging-knee-raise → toes-to-bar` ladder rung |
| `kb-windmill` (20) | reps | hinge, core | skill | Classic getup companion — but it's overhead, so it inherits the F5 decision |

**Deliberately not proposed:** Bulgarian split squat (no bench in your equipment model), nordic curl (no anchor), barbell anything, more EMOM variants (EMOM is excluded from auto-pick — additions there are dead weight until that changes).

**Ladder updates if Tier 1 lands:** insert `ring-assisted-pistol` into the squat chain; add `['kb-row','kb-double-row']`; (Tier 2) insert `hanging-leg-raise` into the hanging-core chain. Each new entry also needs a line in the relevant slot priority list or it will only ever be picked on staleness.

## Decisions needed before I write any code

1. **F5 — overhead policy**: restrict snatch + getup by default, or document "ballistic/loaded overhead allowed, grinding presses restricted"?
2. **F6 — accessory tier**: add `tier: 'main' | 'accessory'` to the schema (my recommendation), or a narrower fix?
3. **Emphasis**: per-emphasis priority lists (a), comparator reorder (b), or accept-as-label (c)?
4. **Additions**: Tier 1 as listed? Tier 2 — which, if any?
5. **Tag fixes F1–F4 + F8** (muscle-group union type, drift cleanup, core-rule documentation): low-risk, propose to just do them in one commit. Veto if you disagree.

All changes would land with tests: slot-pool depth assertions, ladder integrity (every ladder id exists in the catalog), and a tag-consistency test (every `core`-pattern exercise has `core` in muscles) so the rule from F3 stays enforced.

---

## Landed (same day, post sign-off)

Decisions taken at the gate: **restrict snatch + get-up (and windmill) by default · per-emphasis priority lists · tier field · Tier 1 + Tier 2 additions · tag fixes F1–F4 + F8.** Verified: `vitest` **116/116** (was 94, +22), `tsc --noEmit` clean.

- **Types**: `MuscleGroup` union (F8); `lunge` + `carry` patterns; `tier?: 'main' | 'accessory'` on Exercise (F6); default restricted list now covers all overhead (F5).
- **Catalog**: 11 new entries (carries, lunges, ring-assisted pistol, glute bridge, side plank, face pull, hanging leg raise, double row, windmill); F1–F4 tag fixes; tagging rules documented in the file header.
- **Ladders**: `squat → ring-assisted-pistol → pistol-squat`; `hanging-knee-raise → hanging-leg-raise → toes-to-bar`; `kb-row → kb-double-row`.
- **Engine**: per-emphasis slot priorities — cold-start plans now differ by focus day (strength: pull-up/dip/kb-rdl/l-sit/farmer-carry); main slots reject accessories; KB-support slot accepts lunges, conditioning slot accepts carries.
- **Store**: coach-profile persisted version 1 → 2 with a migration that unions the new overhead restrictions into existing profiles (one-shot, so toggling them back off sticks).
- **Coach tab**: restricted-list UI extended from press family to the full overhead family.
- **Tests**: new `exercises.test.ts` catalog-integrity suite (unique ids, ladder integrity, priority ids valid + slot-consistent, pool depth ≥ 2 everywhere, no orphan exercises, accessories never in main slots, core tagging rule); progression test for the row chain; ladder chain tests incl. no rung-skipping without rings.

**Still open from this audit**: F7 (double-KB quantity in the equipment model — latent, doesn't affect a 2×24 owner). Note `kb-emom-swing` remains the only EMOM entry and stays out of auto-pick.
