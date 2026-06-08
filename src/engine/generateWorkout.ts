import { Exercise, Emphasis, PlannedWorkout, UserEquipment, WorkoutSession } from '../types';
import { EXERCISES } from '../data/exercises';
import { isAvailable } from '../data/availability';
import { findLastLogFor } from './history';
import { buildTarget } from './progression';
import { PROGRESSION } from './progressionConfig';
import { dayKey } from '../utils/dayKey';

export const EMPHASIS_ORDER: Emphasis[] = ['strength', 'skill', 'conditioning'];

export interface RotationState {
  lastEmphasis: Emphasis | null;
  sessionCount: number;
}

/** Next focus in the cycle. Skip-aware by construction: we only ever advance one
 *  step from `lastEmphasis`, and that field only moves when a workout completes —
 *  so a multi-day gap never "catches up". */
export function nextEmphasis(last: Emphasis | null): Emphasis {
  const i = last ? EMPHASIS_ORDER.indexOf(last) : -1;
  return EMPHASIS_ORDER[(i + 1) % EMPHASIS_ORDER.length];
}

/**
 * Deterministic, offline coach. Pure: same inputs → same plan (no Math.random).
 * Selection is staleness-ordered (least-recently-trained first, tie-break by id),
 * which both rotates variety and stays stable across re-opens within a day.
 */
export function generateWorkout(
  history: WorkoutSession[],
  rotation: RotationState,
  equipment: UserEquipment,
  allExercises: Exercise[] = EXERCISES,
  date: string = dayKey()
): PlannedWorkout {
  const emphasis = nextEmphasis(rotation.lastEmphasis);
  const trained = lastTrainedMap(history);

  // EMOM is excluded from auto-selection in v1 (its progression is deferred).
  const available = allExercises.filter(
    (e) => e.type !== 'emom' && isAvailable(e, equipment)
  );
  const staleFirst = (a: Exercise, b: Exercise) => {
    const ra = trained[a.id] ?? '';
    const rb = trained[b.id] ?? '';
    return ra === rb ? a.id.localeCompare(b.id) : ra.localeCompare(rb);
  };

  const focusPool = available.filter((e) => e.emphasis.includes(emphasis)).sort(staleFirst);
  let chosen = focusPool.slice(0, PROGRESSION.maxExercisesPerSession);

  // Fill-to-minimum from adjacent emphases (least-recently-trained first) so we
  // never render a near-empty session on an off-equipment / thin-emphasis day.
  if (chosen.length < PROGRESSION.minExercisesPerSession) {
    const filler = available
      .filter((e) => !chosen.includes(e))
      .sort(staleFirst)
      .slice(0, PROGRESSION.minExercisesPerSession - chosen.length);
    chosen = chosen.concat(filler);
  }

  // Build targets; ladder promotion may repoint a slot to a harder exercise, so
  // dedupe by the FINAL exercise id (keep first).
  const seen = new Set<string>();
  const targets = chosen
    .map((e) => buildTarget(e, findLastLogFor(history, e.id), equipment, allExercises))
    .filter((t) => (seen.has(t.exerciseId) ? false : (seen.add(t.exerciseId), true)));

  return { date, emphasis, targets };
}

/**
 * The next exercise to show when the user swaps a card: same emphasis + available
 * + not already in the plan, least-recently-trained first (deterministic). Falls
 * back to any available unused exercise, then to a no-op if nothing's left.
 */
export function nextSwapTarget(
  plan: PlannedWorkout,
  index: number,
  history: WorkoutSession[],
  equipment: UserEquipment,
  allExercises: Exercise[] = EXERCISES
) {
  const used = new Set(plan.targets.map((t) => t.exerciseId));
  const trained = lastTrainedMap(history);
  const usable = (e: Exercise) => e.type !== 'emom' && isAvailable(e, equipment) && !used.has(e.id);
  const staleFirst = (a: Exercise, b: Exercise) => {
    const ra = trained[a.id] ?? '';
    const rb = trained[b.id] ?? '';
    return ra === rb ? a.id.localeCompare(b.id) : ra.localeCompare(rb);
  };
  const focus = allExercises.filter((e) => usable(e) && e.emphasis.includes(plan.emphasis));
  const pool = (focus.length ? focus : allExercises.filter(usable)).sort(staleFirst);
  if (!pool.length) return plan.targets[index];
  return buildTarget(pool[0], findLastLogFor(history, pool[0].id), equipment, allExercises);
}

/** exerciseId → most recent completed-session recency key (for staleness sort). */
function lastTrainedMap(history: WorkoutSession[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of history) {
    if (!s.isCompleted) continue;
    const key = s.completedAt ?? s.date;
    for (const log of s.exerciseLogs) {
      if (log.sets.length === 0) continue;
      if (!map[log.exerciseId] || key > map[log.exerciseId]) map[log.exerciseId] = key;
    }
  }
  return map;
}
