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
  // EMOM (deferred progression in v1): fixed prescription.
  emom: { minutes: 10, reps: 10 },
  // Session shape.
  minExercisesPerSession: 4,
  maxExercisesPerSession: 5,
} as const;
