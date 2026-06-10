import {
  CoachProfile,
  DEFAULT_COACH_PROFILE,
  Exercise,
  ExerciseLog,
  Emphasis,
  MovementPattern,
  PlannedWorkout,
  SessionLength,
  UserEquipment,
  WorkoutSession,
} from '../types';
import { EXERCISES } from '../data/exercises';
import { isAvailable } from '../data/availability';
import { findLastLogFor } from './history';
import { buildTarget } from './progression';
import { PROGRESSION } from './progressionConfig';
import { dayKey } from '../utils/dayKey';

export const EMPHASIS_ORDER: Emphasis[] = ['strength', 'skill', 'conditioning'];

// Broad, shared movement tags that should NOT drive pattern-level avoidance:
// almost every compound lift carries `core`/`full_body`, so avoiding them on a
// single pain flag would strip unrelated work from the whole plan. Pain still
// downranks the exact exercise; only the specific (joint-local) patterns are avoided.
const NON_AVOIDABLE_PATTERNS: ReadonlySet<MovementPattern> = new Set<MovementPattern>([
  'core',
  'full_body',
]);

export interface RotationState {
  lastEmphasis: Emphasis | null;
  sessionCount: number;
}

interface CoachAdjustments {
  downrankExerciseIds: Set<string>;
  avoidPatterns: Set<MovementPattern>;
}

interface WorkoutSlot {
  id: string;
  label: string;
  priority: string[];
  matches: (exercise: Exercise) => boolean;
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
  coachProfile: CoachProfile = DEFAULT_COACH_PROFILE,
  allExercises: Exercise[] = EXERCISES,
  date: string = dayKey()
): PlannedWorkout {
  const emphasis = nextEmphasis(rotation.lastEmphasis);
  const trained = lastTrainedMap(history);
  const adjustments = buildCoachAdjustments(history, coachProfile, allExercises);

  // EMOM is excluded from auto-selection in v1 (its progression is deferred).
  const available = allExercises.filter(
    (e) =>
      e.type !== 'emom' &&
      isAvailable(e, equipment) &&
      !coachProfile.restrictedAutoPickExerciseIds.includes(e.id)
  );

  const chosen = chooseSlotWorkout(available, history, trained, emphasis, coachProfile, adjustments);

  // Build targets; ladder promotion may repoint a slot to a harder exercise, so
  // dedupe by the FINAL exercise id (keep first).
  const seen = new Set<string>();
  const targets = chosen
    .map((e) =>
      buildTarget(
        e,
        findLastLogFor(history, e.id),
        equipment,
        allExercises,
        recentLogsFor(history, e.id),
        coachProfile
      )
    )
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
  coachProfile: CoachProfile = DEFAULT_COACH_PROFILE,
  allExercises: Exercise[] = EXERCISES
) {
  const used = new Set(plan.targets.map((t) => t.exerciseId));
  const current = allExercises.find((e) => e.id === plan.targets[index]?.exerciseId);
  const slot = current ? slotsForSessionLength(coachProfile.sessionLength).find((s) => s.matches(current)) : undefined;
  const trained = lastTrainedMap(history);
  const adjustments = buildCoachAdjustments(history, coachProfile, allExercises);
  const usable = (e: Exercise) =>
    e.type !== 'emom' &&
    isAvailable(e, equipment) &&
    !used.has(e.id) &&
    !coachProfile.restrictedAutoPickExerciseIds.includes(e.id);
  const slotPool = slot ? allExercises.filter((e) => usable(e) && slot.matches(e)) : [];
  const focus = allExercises.filter((e) => usable(e) && e.emphasis.includes(plan.emphasis));
  const fallback = allExercises.filter(usable);
  const rawPool = slotPool.length ? slotPool : focus.length ? focus : fallback;
  const pool = preferNonAvoided(rawPool, adjustments).sort((a, b) =>
    compareCandidates(a, b, slot, trained, adjustments, plan.emphasis)
  );
  if (!pool.length) return plan.targets[index];
  return buildTarget(
    pool[0],
    findLastLogFor(history, pool[0].id),
    equipment,
    allExercises,
    recentLogsFor(history, pool[0].id),
    coachProfile
  );
}

function chooseSlotWorkout(
  available: Exercise[],
  history: WorkoutSession[],
  trained: Record<string, string>,
  emphasis: Emphasis,
  coachProfile: CoachProfile,
  adjustments: CoachAdjustments
): Exercise[] {
  const slots = slotsForSessionLength(coachProfile.sessionLength);
  const chosen: Exercise[] = [];
  const used = new Set<string>();

  for (const slot of slots) {
    const candidates = preferNonAvoided(
      available.filter((e) => !used.has(e.id) && slot.matches(e)),
      adjustments
    ).sort((a, b) => compareCandidates(a, b, slot, trained, adjustments, emphasis));
    if (!candidates.length) continue;
    chosen.push(candidates[0]);
    used.add(candidates[0].id);
  }

  while (chosen.length < slots.length) {
    const filler = preferNonAvoided(
      available.filter((e) => !used.has(e.id)),
      adjustments
    ).sort((a, b) => compareCandidates(a, b, undefined, trained, adjustments, emphasis));
    if (!filler.length) break;
    chosen.push(filler[0]);
    used.add(filler[0].id);
  }

  return chosen;
}

function slotsForSessionLength(length: SessionLength): WorkoutSlot[] {
  const pull: WorkoutSlot = {
    id: 'pull',
    label: 'Pull',
    priority: ['pull-up', 'ring-row', 'chin-up', 'ring-pull-up', 'muscle-up'],
    matches: (e) =>
      e.category === 'calisthenics' &&
      hasAnyPattern(e, ['vertical_pull', 'horizontal_pull']),
  };
  const push: WorkoutSlot = {
    id: 'push',
    label: 'Push',
    priority: ['push-up', 'dip', 'ring-push-up', 'pike-push-up', 'ring-dip'],
    matches: (e) =>
      e.category === 'calisthenics' &&
      hasAnyPattern(e, ['horizontal_push', 'dip', 'vertical_push']),
  };
  const kbSupport: WorkoutSlot = {
    id: 'kb-support',
    label: 'KB support',
    priority: ['kb-row', 'kb-swing', 'kb-rdl', 'kb-double-swing', 'kb-goblet-squat'],
    matches: (e) =>
      e.category === 'kettlebell' && hasAnyPattern(e, ['row', 'hinge', 'swing']),
  };
  const kbRow: WorkoutSlot = {
    id: 'kb-row',
    label: 'KB row',
    priority: ['kb-row'],
    matches: (e) => e.category === 'kettlebell' && hasAnyPattern(e, ['row']),
  };
  const kbHinge: WorkoutSlot = {
    id: 'kb-hinge',
    label: 'KB hinge',
    priority: ['kb-swing', 'kb-double-swing', 'kb-rdl', 'kb-clean'],
    matches: (e) =>
      e.category === 'kettlebell' && hasAnyPattern(e, ['swing', 'hinge']),
  };
  const coreSkill: WorkoutSlot = {
    id: 'core-skill',
    label: 'Core / skill',
    priority: ['hollow-body', 'hanging-knee-raise', 'l-sit', 'toes-to-bar', 'pistol-squat'],
    matches: (e) => hasAnyPattern(e, ['core']) || e.emphasis.includes('skill'),
  };
  const conditioning: WorkoutSlot = {
    id: 'conditioning-accessory',
    label: 'Conditioning / accessory',
    priority: ['band-pull-apart', 'squat', 'hanging-knee-raise', 'kb-swing', 'kb-double-swing'],
    matches: (e) =>
      e.emphasis.includes('conditioning') &&
      (e.category === 'calisthenics' || hasAnyPattern(e, ['swing', 'hinge'])),
  };

  if (length === 'short') return [pull, push, kbSupport, coreSkill];
  if (length === 'long') return [pull, push, kbRow, kbHinge, coreSkill, conditioning];
  return [pull, push, kbSupport, coreSkill, conditioning];
}

function buildCoachAdjustments(
  history: WorkoutSession[],
  coachProfile: CoachProfile,
  allExercises: Exercise[]
): CoachAdjustments {
  const downrankExerciseIds = new Set<string>();
  const avoidPatterns = new Set<MovementPattern>();
  if (!coachProfile.autoAdjust.enabled) return { downrankExerciseIds, avoidPatterns };

  const recent = history
    .filter((s) => s.isCompleted)
    .sort((a, b) => recencyKey(b).localeCompare(recencyKey(a)))
    .slice(0, coachProfile.autoAdjust.recentSessionWindow);

  for (const session of recent) {
    for (const log of session.exerciseLogs) {
      const pain = log.feedback?.pain;
      if (pain == null) continue;
      if (pain >= coachProfile.autoAdjust.painDownrankThreshold) {
        downrankExerciseIds.add(log.exerciseId);
      }
      if (pain >= coachProfile.autoAdjust.painAvoidPatternThreshold) {
        const exercise = allExercises.find((e) => e.id === log.exerciseId);
        for (const pattern of exercise?.movementPatterns ?? []) {
          if (NON_AVOIDABLE_PATTERNS.has(pattern)) continue;
          avoidPatterns.add(pattern);
        }
      }
    }
  }

  return { downrankExerciseIds, avoidPatterns };
}

function preferNonAvoided(candidates: Exercise[], adjustments: CoachAdjustments): Exercise[] {
  if (adjustments.avoidPatterns.size === 0) return candidates;
  const nonAvoided = candidates.filter((e) => !matchesAvoidedPattern(e, adjustments));
  return nonAvoided.length ? nonAvoided : candidates;
}

function compareCandidates(
  a: Exercise,
  b: Exercise,
  slot: WorkoutSlot | undefined,
  trained: Record<string, string>,
  adjustments: CoachAdjustments,
  emphasis: Emphasis
): number {
  const safe = adjustmentPenalty(a, adjustments) - adjustmentPenalty(b, adjustments);
  if (safe !== 0) return safe;

  const recency = compareRecency(a, b, trained);
  if (recency !== 0) return recency;

  const slotPriority = priorityIndex(a, slot) - priorityIndex(b, slot);
  if (slotPriority !== 0) return slotPriority;

  const emphasisFit = Number(!a.emphasis.includes(emphasis)) - Number(!b.emphasis.includes(emphasis));
  if (emphasisFit !== 0) return emphasisFit;

  return a.id.localeCompare(b.id);
}

function adjustmentPenalty(exercise: Exercise, adjustments: CoachAdjustments): number {
  let penalty = 0;
  if (adjustments.downrankExerciseIds.has(exercise.id)) penalty += 100;
  if (matchesAvoidedPattern(exercise, adjustments)) penalty += 1000;
  return penalty;
}

function priorityIndex(exercise: Exercise, slot: WorkoutSlot | undefined): number {
  if (!slot) return 999;
  const i = slot.priority.indexOf(exercise.id);
  return i === -1 ? 999 : i;
}

function compareRecency(a: Exercise, b: Exercise, trained: Record<string, string>): number {
  const ra = trained[a.id] ?? '';
  const rb = trained[b.id] ?? '';
  return ra === rb ? 0 : ra.localeCompare(rb);
}

function hasAnyPattern(exercise: Exercise, patterns: MovementPattern[]): boolean {
  return patterns.some((p) => exercise.movementPatterns.includes(p));
}

function matchesAvoidedPattern(exercise: Exercise, adjustments: CoachAdjustments): boolean {
  return exercise.movementPatterns.some((p) => adjustments.avoidPatterns.has(p));
}

function recentLogsFor(history: WorkoutSession[], exerciseId: string): ExerciseLog[] {
  return history
    .filter((s) => s.isCompleted)
    .sort((a, b) => recencyKey(b).localeCompare(recencyKey(a)))
    .map((s) => s.exerciseLogs.find((l) => l.exerciseId === exerciseId))
    .filter((l): l is ExerciseLog => l != null);
}

function recencyKey(session: WorkoutSession): string {
  return session.completedAt ?? session.date;
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
