import { Exercise, ExerciseLog, ExerciseTarget, UserEquipment } from '../types';
import { PROGRESSION } from './progressionConfig';
import { ownedKbWeightsFor } from '../data/availability';
import { nextRung } from '../data/ladders';

// ── Ceiling detection ───────────────────────────────────────────────────────
// "Hit the rep ceiling" must be well-defined over a VARIABLE-LENGTH, uncapped
// set list (set count is advisory — the user can log 3 sets or 7). Rule:
// you've earned the jump when you logged at least `targetSets` sets at the
// weight AND your best `targetSets` of them all reached `repMax`. Extra sets
// help (we take your best N); a junk back-off set doesn't block you.

export function topNMin(values: number[], n: number): number {
  if (values.length < n) return -Infinity;
  return [...values].sort((a, b) => b - a).slice(0, n)[n - 1];
}

export function ceilingHit(repsAtWeight: number[], targetSets: number, repMax: number): boolean {
  if (repsAtWeight.length < targetSets) return false;
  return topNMin(repsAtWeight, targetSets) >= repMax;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Reps from sets performed at `weightKg`. Weight guard: a set logged with no
 * weight is treated as having been at `weightKg` (SetLogger pre-fills it, but if
 * the user cleared it we assume the prescription rather than dropping the set).
 */
function repsAtWeight(log: ExerciseLog, weightKg: number): number[] {
  return log.sets
    .filter((s) => (s.weight ?? weightKg) === weightKg)
    .map((s) => s.reps ?? 0);
}

/** The heaviest weight the user actually worked at last time, else the baseline. */
function currentWeight(log: ExerciseLog, ownedAscending: number[]): number {
  const logged = log.sets.map((s) => s.weight).filter((w): w is number => w != null);
  if (logged.length) return Math.max(...logged);
  return ownedAscending[0] ?? 0;
}

// ── Target builders (pure) ──────────────────────────────────────────────────

/**
 * Compute today's target for one exercise from its most recent completed log.
 * May return a target whose `exerciseId` differs from `exercise` when a ladder
 * promotion fires (the "Leveled up" moment).
 */
export function buildTarget(
  exercise: Exercise,
  lastLog: ExerciseLog | undefined,
  equipment: UserEquipment,
  allExercises: Exercise[]
): ExerciseTarget {
  if (exercise.type === 'emom') return buildEmomTarget(exercise);
  if (exercise.type === 'time') return buildTimeTarget(exercise, lastLog);
  if (exercise.category === 'kettlebell')
    return buildKbTarget(exercise, lastLog, equipment, allExercises);
  return buildBodyweightTarget(exercise, lastLog, equipment, allExercises);
}

function buildKbTarget(
  exercise: Exercise,
  lastLog: ExerciseLog | undefined,
  equipment: UserEquipment,
  allExercises: Exercise[]
): ExerciseTarget {
  const cfg = PROGRESSION.kb;
  const owned = ownedKbWeightsFor(exercise, equipment);
  const baseline = owned[0];

  if (!lastLog) {
    return {
      exerciseId: exercise.id,
      sets: cfg.sets,
      targetReps: cfg.repMin,
      weightKg: baseline,
      reason: `Baseline — log honestly at ${baseline}kg`,
    };
  }

  const cur = currentWeight(lastLog, owned);
  const reps = repsAtWeight(lastLog, cur);

  if (ceilingHit(reps, cfg.sets, cfg.repMax)) {
    // Earned a jump. Order is fixed: heavier kettlebell first, ladder only when
    // the top owned KB's ceiling is also hit.
    const heavier = owned.find((w) => w > cur);
    if (heavier != null) {
      return {
        exerciseId: exercise.id,
        sets: cfg.sets,
        targetReps: cfg.repMin,
        weightKg: heavier,
        reason: `Moved up to ${heavier}kg — reset to ${cfg.repMin} reps`,
      };
    }
    const rung = nextRung(exercise.id, allExercises, equipment);
    if (rung) return promote(exercise, rung, equipment, allExercises);
    return {
      exerciseId: exercise.id,
      sets: cfg.sets,
      targetReps: cfg.repMax + 1,
      weightKg: cur,
      reason: `Top of range — add volume: ${cfg.sets}×${cfg.repMax + 1} at ${cur}kg`,
    };
  }

  const best = reps.length ? Math.max(...reps) : cfg.repMin - 1;
  const next = clamp(best + 1, cfg.repMin, cfg.repMax);
  return {
    exerciseId: exercise.id,
    sets: cfg.sets,
    targetReps: next,
    weightKg: cur,
    reason:
      next > best
        ? `Beat last: ${best} → ${next} reps at ${cur}kg`
        : `Hold: ${next} reps at ${cur}kg`,
  };
}

function buildBodyweightTarget(
  exercise: Exercise,
  lastLog: ExerciseLog | undefined,
  equipment: UserEquipment,
  allExercises: Exercise[]
): ExerciseTarget {
  const cfg = PROGRESSION.bodyweight;

  if (!lastLog) {
    return {
      exerciseId: exercise.id,
      sets: cfg.sets,
      targetReps: cfg.repMin,
      reason: 'Baseline — log honestly',
    };
  }

  const reps = lastLog.sets.map((s) => s.reps ?? 0);

  if (ceilingHit(reps, cfg.sets, cfg.repMax)) {
    const rung = nextRung(exercise.id, allExercises, equipment);
    if (rung) return promote(exercise, rung, equipment, allExercises);
    return {
      exerciseId: exercise.id,
      sets: cfg.sets,
      targetReps: cfg.repMax + 1,
      reason: `Top of range — add volume: ${cfg.sets}×${cfg.repMax + 1}`,
    };
  }

  const best = reps.length ? Math.max(...reps) : cfg.repMin - 1;
  const next = clamp(best + 1, cfg.repMin, cfg.repMax);
  return {
    exerciseId: exercise.id,
    sets: cfg.sets,
    targetReps: next,
    reason: next > best ? `Beat last: ${best} → ${next} reps` : `Hold: ${next} reps`,
  };
}

function buildTimeTarget(exercise: Exercise, lastLog: ExerciseLog | undefined): ExerciseTarget {
  const cfg = PROGRESSION.time;
  const best = lastLog
    ? Math.max(0, ...lastLog.sets.map((s) => s.duration ?? 0))
    : 0;
  const next = best > 0 ? best + cfg.increment : cfg.secMin;
  return {
    exerciseId: exercise.id,
    sets: cfg.sets,
    targetSeconds: next,
    reason: best > 0 ? `Beat last: ${best}s → ${next}s` : `Baseline — hold ${next}s`,
  };
}

function buildEmomTarget(exercise: Exercise): ExerciseTarget {
  const cfg = PROGRESSION.emom;
  return {
    exerciseId: exercise.id,
    sets: 1,
    targetReps: cfg.reps,
    emomMinutes: cfg.minutes,
    reason: `EMOM: ${cfg.reps} reps/min for ${cfg.minutes} min`,
  };
}

/** Build the promoted rung's cold-start baseline, with the level-up reason. */
function promote(
  from: Exercise,
  rung: Exercise,
  equipment: UserEquipment,
  allExercises: Exercise[]
): ExerciseTarget {
  const base = buildTarget(rung, undefined, equipment, allExercises);
  return { ...base, reason: `Leveled up: ${from.name} → ${rung.name}` };
}
