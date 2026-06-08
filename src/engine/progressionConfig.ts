/**
 * All progression tuning knobs in one place. These are first-guess defaults —
 * adjust by feel after real sessions. Centralized so tuning is a one-line edit
 * and tests can assert against the same source of truth.
 */
export const PROGRESSION = {
  // Kettlebell reps: double progression on a 5-8 rep window across 5 sets.
  kb: { sets: 5, repMin: 5, repMax: 8 },
  // Bodyweight reps: 6-12 rep window across 4 sets; "weight jump" = ladder promotion.
  bodyweight: { sets: 4, repMin: 6, repMax: 12 },
  // Timed holds (L-sit, hollow body): add 5s per session up to a ceiling, then promote.
  time: { sets: 3, secMin: 15, increment: 5, ceiling: 30 },
  // EMOM progression (v2). v1 was a fixed prescription. Double-progression on
  // two dimensions: first add reps/min up to `repMax`, then (at the rep ceiling)
  // add a minute and reset reps/min to baseline. `minutes`/`reps` are the
  // cold-start baseline. Success condition = the user SUSTAINED the work: the
  // weakest logged minute held the level across at least the prescribed minutes
  // (no drop-off). A faded minute → hold at that sustained floor instead.
  emom: {
    minutes: 10,
    reps: 10,
    repStep: 1,
    repMax: 15,
    minuteStep: 1,
    maxMinutes: 20,
  },
  // Automatic deload (v2). v1 only "held target on a bad day"; a sustained
  // stall earns a back-off. A "stall session" = the user's best working set at
  // the current weight fell BELOW the bottom of the rep window (repMin) — i.e.
  // they couldn't even hold the floor of the range. After `stallSessions`
  // consecutive such sessions at the same weight, deload: step down to the next
  // lighter owned KB and reset to repMin; if none, drop the rep target by
  // `repDrop` (floored at 1). Boundaries tested in progression.test.ts.
  deload: { stallSessions: 3, repDrop: 2 },
  // Session shape.
  minExercisesPerSession: 4,
  maxExercisesPerSession: 6,
} as const;
