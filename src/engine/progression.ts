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

// ── Deload detection (v2) ────────────────────────────────────────────────────
// A "stall session" at `weightKg` = the user worked at that weight but their
// best set there fell BELOW `repMin` — they couldn't hold the floor of the rep
// window. `stalledRun` counts the LEADING run of such sessions in `recentLogs`
// (newest-first): the streak ends at the first session that wasn't a same-weight
// stall (a good session, or work at a different weight). `>= stallSessions` of
// them in a row earns the deload. Pure over the logs handed in — no cross-call
// state. Returns 0 when `recentLogs` is empty, so 4-arg callers never deload.
function isStallAt(log: ExerciseLog, weightKg: number, repMin: number): boolean {
  const reps = repsAtWeight(log, weightKg);
  if (reps.length === 0) return false; // didn't work this weight → not a stall here
  return Math.max(...reps) < repMin;
}

function stalledRun(recentLogs: ExerciseLog[], weightKg: number, repMin: number): number {
  let run = 0;
  for (const log of recentLogs) {
    if (!isStallAt(log, weightKg, repMin)) break;
    run += 1;
  }
  return run;
}

// Bodyweight has no weight dimension: a stall = best logged set below repMin.
function stalledRunBodyweight(recentLogs: ExerciseLog[], repMin: number): number {
  let run = 0;
  for (const log of recentLogs) {
    const reps = log.sets.map((s) => s.reps ?? 0);
    if (reps.length === 0 || Math.max(...reps) >= repMin) break;
    run += 1;
  }
  return run;
}

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
  allExercises: Exercise[],
  // Recent completed logs for this exercise, NEWEST-FIRST, used only by the v2
  // auto-deload rule to detect a sustained stall. Optional + defaulted so the
  // 4-arg callers in generateWorkout.ts compile unchanged; wiring the engine to
  // actually pass recent history is a separate (out-of-scope) task — until then
  // this defaults to [] and no deload ever fires through generateWorkout.
  recentLogs: ExerciseLog[] = []
): ExerciseTarget {
  if (exercise.type === 'emom') return buildEmomTarget(exercise, lastLog);
  if (exercise.type === 'time') return buildTimeTarget(exercise, lastLog);
  if (exercise.category === 'kettlebell')
    return buildKbTarget(exercise, lastLog, equipment, allExercises, recentLogs);
  return buildBodyweightTarget(exercise, lastLog, equipment, allExercises, recentLogs);
}

function buildKbTarget(
  exercise: Exercise,
  lastLog: ExerciseLog | undefined,
  equipment: UserEquipment,
  allExercises: Exercise[],
  recentLogs: ExerciseLog[] = []
): ExerciseTarget {
  const cfg = PROGRESSION.kb;
  const dl = PROGRESSION.deload;
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

  // Auto-deload (v2): a sustained stall at the current weight earns a back-off,
  // checked BEFORE normal progression. Step down to the next lighter owned KB
  // and reset to repMin; if already at the lightest, drop the rep target instead.
  if (stalledRun(recentLogs, cur, cfg.repMin) >= dl.stallSessions) {
    const lighter = [...owned].reverse().find((w) => w < cur);
    if (lighter != null) {
      return {
        exerciseId: exercise.id,
        sets: cfg.sets,
        targetReps: cfg.repMin,
        weightKg: lighter,
        reason: `Deload: stalled at ${cur}kg — drop to ${lighter}kg, reset to ${cfg.repMin} reps`,
      };
    }
    const dropped = Math.max(1, cfg.repMin - dl.repDrop);
    return {
      exerciseId: exercise.id,
      sets: cfg.sets,
      targetReps: dropped,
      weightKg: cur,
      reason: `Deload: stalled at ${cur}kg — back off to ${dropped} reps`,
    };
  }

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
  allExercises: Exercise[],
  recentLogs: ExerciseLog[] = []
): ExerciseTarget {
  const cfg = PROGRESSION.bodyweight;
  const dl = PROGRESSION.deload;

  if (!lastLog) {
    return {
      exerciseId: exercise.id,
      sets: cfg.sets,
      targetReps: cfg.repMin,
      reason: 'Baseline — log honestly',
    };
  }

  const reps = lastLog.sets.map((s) => s.reps ?? 0);

  // Auto-deload (v2): a sustained stall (best set below repMin) drops the rep
  // target. No weight to shed, so back off reps directly. Checked before the
  // ceiling/+1 logic, same as the KB path.
  if (stalledRunBodyweight(recentLogs, cfg.repMin) >= dl.stallSessions) {
    const dropped = Math.max(1, cfg.repMin - dl.repDrop);
    return {
      exerciseId: exercise.id,
      sets: cfg.sets,
      targetReps: dropped,
      reason: `Deload: stalled — back off to ${dropped} reps`,
    };
  }

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

/**
 * EMOM progression (v2). The log is one set per worked minute, each carrying
 * that minute's reps. "Sustained" = the WEAKEST minute held the level (no
 * drop-off) across at least the minutes worked — only then do we advance.
 * Double-progression: bump reps/min up to `repMax`, then add a minute and reset
 * reps/min to baseline. A faded minute holds at the sustained floor instead.
 */
function buildEmomTarget(exercise: Exercise, lastLog: ExerciseLog | undefined): ExerciseTarget {
  const cfg = PROGRESSION.emom;
  const emit = (reps: number, mins: number, reason: string): ExerciseTarget => ({
    exerciseId: exercise.id,
    sets: 1,
    targetReps: reps,
    emomMinutes: mins,
    reason,
  });

  const perMinute = (lastLog?.sets ?? []).map((s) => s.reps ?? 0);
  if (perMinute.length === 0) {
    return emit(cfg.reps, cfg.minutes, `EMOM: ${cfg.reps} reps/min for ${cfg.minutes} min`);
  }

  const minutesDone = perMinute.length;
  const weakest = Math.min(...perMinute);
  const strongest = Math.max(...perMinute);
  const sustained = weakest === strongest; // held the same reps every minute

  if (!sustained) {
    // Faded: settle back to the floor you actually held all the way through.
    return emit(weakest, minutesDone, `Hold: ${weakest} reps/min for ${minutesDone} min`);
  }

  if (weakest < cfg.repMax) {
    const nextReps = Math.min(weakest + cfg.repStep, cfg.repMax);
    return emit(nextReps, minutesDone, `Beat last: ${nextReps} reps/min for ${minutesDone} min`);
  }

  // At the rep/min ceiling and sustained → add a minute, reset reps to baseline.
  const nextMins = Math.min(minutesDone + cfg.minuteStep, cfg.maxMinutes);
  if (nextMins > minutesDone) {
    return emit(cfg.reps, nextMins, `Add a minute: ${cfg.reps} reps/min for ${nextMins} min`);
  }
  // Fully maxed (rep ceiling AND minute ceiling) → hold the top prescription.
  return emit(cfg.repMax, minutesDone, `Top of EMOM: ${cfg.repMax} reps/min for ${minutesDone} min`);
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
