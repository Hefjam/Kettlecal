import { describe, it, expect } from 'vitest';
import { generateWorkout, nextEmphasis, nextSwapTarget, RotationState } from './generateWorkout';
import { EXERCISES } from '../data/exercises';
import { DEFAULT_COACH_PROFILE, ExerciseLog, SessionLength, UserEquipment, WorkoutSession } from '../types';

const full: UserEquipment = {
  items: [
    'pull-up-bar',
    'dip-bars',
    'gymnastics-rings',
    'bands',
    'kettlebell-20kg',
    'kettlebell-24kg',
    'bodyweight',
  ],
  kettlebells: [
    { weightKg: 20, quantity: 1 },
    { weightKg: 24, quantity: 2 },
  ],
};
const bodyweightOnly: UserEquipment = { items: ['bodyweight'], kettlebells: [] };

const rot = (lastEmphasis: RotationState['lastEmphasis']): RotationState => ({
  lastEmphasis,
  sessionCount: 0,
});
const profile = (sessionLength: SessionLength = 'standard') => ({
  ...DEFAULT_COACH_PROFILE,
  sessionLength,
});
// Auto-adjust is opt-in (off by default), so tests that exercise pain/RPE
// adaptation must turn it on explicitly.
const autoAdjustProfile = (sessionLength: SessionLength = 'short') => ({
  ...DEFAULT_COACH_PROFILE,
  sessionLength,
  autoAdjust: { ...DEFAULT_COACH_PROFILE.autoAdjust, enabled: true },
});
const restricted = new Set(DEFAULT_COACH_PROFILE.restrictedAutoPickExerciseIds);
const targetIds = (length: SessionLength) =>
  generateWorkout([], rot(null), full, profile(length), EXERCISES, '2026-06-08').targets.map(
    (t) => t.exerciseId
  );

function session(id: string, logs: ExerciseLog[]): WorkoutSession {
  return {
    id,
    date: '2026-06-01T10:00:00.000Z',
    startedAt: '2026-06-01T10:00:00.000Z',
    completedAt: '2026-06-01T10:30:00.000Z',
    exerciseLogs: logs,
    isCompleted: true,
  };
}

const log = (exerciseId: string, pain?: number): ExerciseLog => ({
  exerciseId,
  feedback: pain == null ? undefined : { pain },
  sets: [{ reps: 6, completedAt: '2026-06-01T10:05:00.000Z' }],
});

describe('nextEmphasis (skip-aware rotation)', () => {
  it('cycles strength -> skill -> conditioning -> strength', () => {
    expect(nextEmphasis(null)).toBe('strength');
    expect(nextEmphasis('strength')).toBe('skill');
    expect(nextEmphasis('skill')).toBe('conditioning');
    expect(nextEmphasis('conditioning')).toBe('strength');
  });
});

describe('generateWorkout coach profile', () => {
  it('generates the default calisthenics-primary standard workout without KB press auto-picks', () => {
    const ids = targetIds('standard');
    expect(ids).toHaveLength(5);
    expect(ids.filter((id) => EXERCISES.find((e) => e.id === id)?.category === 'calisthenics').length).toBeGreaterThanOrEqual(3);
    expect(ids.some((id) => restricted.has(id))).toBe(false);
    expect(ids).toEqual(['pull-up', 'push-up', 'kb-row', 'hollow-body', 'band-pull-apart']);
  });

  it('honors short, standard, and long session lengths', () => {
    expect(targetIds('short')).toHaveLength(4);
    expect(targetIds('standard')).toHaveLength(5);
    expect(targetIds('long')).toHaveLength(6);
  });

  it('fills missing KB slots from available bodyweight work when gear is thin', () => {
    const plan = generateWorkout([], rot(null), bodyweightOnly, profile('standard'), EXERCISES, '2026-06-08');
    expect(plan.targets).toHaveLength(5);
    expect(plan.targets.every((t) => !t.exerciseId.startsWith('kb-'))).toBe(true);
  });

  it('never auto-selects EMOM exercises', () => {
    const plan = generateWorkout([], rot('skill'), full, profile('long'), EXERCISES, '2026-06-08');
    expect(plan.targets.some((t) => t.exerciseId === 'kb-emom-swing')).toBe(false);
  });

  it('is deterministic: same inputs produce the same plan', () => {
    const a = generateWorkout([], rot(null), full, profile(), EXERCISES, '2026-06-08');
    const b = generateWorkout([], rot(null), full, profile(), EXERCISES, '2026-06-08');
    expect(a).toEqual(b);
  });

  it('stamps the provided date', () => {
    const plan = generateWorkout([], rot(null), full, profile(), EXERCISES, '2026-06-08');
    expect(plan.date).toBe('2026-06-08');
  });

  it('downranks exact exercises after moderate pain feedback', () => {
    const history = [session('pain', [log('pull-up', 4), log('ring-row')])];
    const pullOptions = EXERCISES.filter((e) => ['pull-up', 'ring-row'].includes(e.id));
    const plan = generateWorkout(history, rot(null), full, autoAdjustProfile('short'), pullOptions, '2026-06-08');
    expect(plan.targets[0].exerciseId).toBe('ring-row');
  });

  it('avoids a painful movement pattern when a non-matching alternative exists', () => {
    const history = [session('pain', [log('pull-up', 6), log('ring-row')])];
    const pullOptions = EXERCISES.filter((e) => ['pull-up', 'ring-row'].includes(e.id));
    const plan = generateWorkout(history, rot(null), full, autoAdjustProfile('short'), pullOptions, '2026-06-08');
    const first = EXERCISES.find((e) => e.id === plan.targets[0].exerciseId)!;
    expect(first.movementPatterns).not.toContain('vertical_pull');
  });
});

describe('generateWorkout — opt-in default & edge cases', () => {
  it('ships with auto-adjust OFF by default', () => {
    expect(DEFAULT_COACH_PROFILE.autoAdjust.enabled).toBe(false);
  });

  it('with auto-adjust off, pain does NOT change selection', () => {
    const history = [session('pain', [log('pull-up', 6), log('ring-row')])];
    const pullOptions = EXERCISES.filter((e) => ['pull-up', 'ring-row'].includes(e.id));
    // profile() uses the default (auto-adjust disabled) → pain is ignored,
    // so the pull slot falls to its priority pick (pull-up) not the avoid pick.
    const plan = generateWorkout(history, rot(null), full, profile('short'), pullOptions, '2026-06-08');
    expect(plan.targets[0].exerciseId).toBe('pull-up');
  });

  it('empty equipment yields an empty plan without throwing', () => {
    const empty: UserEquipment = { items: [], kettlebells: [] };
    const plan = generateWorkout([], rot(null), empty, profile('standard'), EXERCISES, '2026-06-08');
    expect(plan.targets).toHaveLength(0);
  });

  it('all exercises restricted yields an empty plan', () => {
    const allRestricted = {
      ...DEFAULT_COACH_PROFILE,
      restrictedAutoPickExerciseIds: EXERCISES.map((e) => e.id),
    };
    const plan = generateWorkout([], rot(null), full, allRestricted, EXERCISES, '2026-06-08');
    expect(plan.targets).toHaveLength(0);
  });

  it('still fills a slot when every candidate matches an avoided pattern', () => {
    const history = [session('p', [log('pull-up', 6), log('chin-up', 6)])];
    const opts = EXERCISES.filter((e) => ['pull-up', 'chin-up'].includes(e.id));
    const plan = generateWorkout(history, rot(null), full, autoAdjustProfile('short'), opts, '2026-06-08');
    expect(plan.targets.length).toBeGreaterThan(0);
    expect(['pull-up', 'chin-up']).toContain(plan.targets[0].exerciseId);
  });

  it('broad patterns (core) do not drive avoidance — pain on a snatch keeps core work', () => {
    const history = [session('p', [log('kb-snatch', 6)])];
    const plan = generateWorkout(history, rot(null), full, autoAdjustProfile('standard'), EXERCISES, '2026-06-08');
    const ids = plan.targets.map((t) => t.exerciseId);
    const hasCore = ids.some((id) => EXERCISES.find((e) => e.id === id)?.movementPatterns.includes('core'));
    expect(hasCore).toBe(true);
  });
});

describe('nextSwapTarget', () => {
  it('respects restricted auto-pick movements', () => {
    const plan = {
      date: '2026-06-08',
      emphasis: 'strength' as const,
      targets: [{ exerciseId: 'kb-row', sets: 5, targetReps: 5, weightKg: 20, reason: 'x' }],
    };
    const swap = nextSwapTarget(plan, 0, [], full, profile(), EXERCISES);
    expect(restricted.has(swap.exerciseId)).toBe(false);
  });
});
