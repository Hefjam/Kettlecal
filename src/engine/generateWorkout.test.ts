import { describe, it, expect } from 'vitest';
import { generateWorkout, nextEmphasis, RotationState } from './generateWorkout';
import { EXERCISES } from '../data/exercises';
import { PROGRESSION } from './progressionConfig';
import { UserEquipment } from '../types';

const full: UserEquipment = {
  items: ['pull-up-bar', 'dip-bars', 'gymnastics-rings', 'bands', 'kettlebell-20kg', 'kettlebell-24kg', 'bodyweight'],
  kettlebells: [
    { weightKg: 20, quantity: 1 },
    { weightKg: 24, quantity: 2 },
  ],
};
const bodyweightOnly: UserEquipment = { items: ['bodyweight'], kettlebells: [] };

const emphasisOf = (id: string) => EXERCISES.find((e) => e.id === id)!.emphasis;
const rot = (lastEmphasis: RotationState['lastEmphasis']): RotationState => ({ lastEmphasis, sessionCount: 0 });

describe('nextEmphasis (skip-aware rotation)', () => {
  it('cycles strength → skill → conditioning → strength', () => {
    expect(nextEmphasis(null)).toBe('strength');
    expect(nextEmphasis('strength')).toBe('skill');
    expect(nextEmphasis('skill')).toBe('conditioning');
    expect(nextEmphasis('conditioning')).toBe('strength');
  });
});

describe('generateWorkout', () => {
  it('selects only exercises tagged with today’s emphasis when the pool is deep enough', () => {
    const plan = generateWorkout([], rot(null), full, EXERCISES, '2026-06-08');
    expect(plan.emphasis).toBe('strength');
    expect(plan.targets.length).toBe(PROGRESSION.maxExercisesPerSession);
    for (const t of plan.targets) {
      expect(emphasisOf(t.exerciseId)).toContain('strength');
    }
  });

  it('fills to the minimum from other emphases when the focus pool is thin', () => {
    // bodyweight-only → "skill" focus has just 3 available exercises (< min 4).
    const plan = generateWorkout([], rot('strength'), bodyweightOnly, EXERCISES, '2026-06-08');
    expect(plan.emphasis).toBe('skill');
    expect(plan.targets.length).toBe(PROGRESSION.minExercisesPerSession);
    const hasFiller = plan.targets.some((t) => !emphasisOf(t.exerciseId).includes('skill'));
    expect(hasFiller).toBe(true);
  });

  it('never auto-selects EMOM exercises (deferred progression)', () => {
    const plan = generateWorkout([], rot('skill'), full, EXERCISES, '2026-06-08');
    expect(plan.emphasis).toBe('conditioning');
    expect(plan.targets.some((t) => t.exerciseId === 'kb-emom-swing')).toBe(false);
  });

  it('is deterministic — same inputs produce the same plan', () => {
    const a = generateWorkout([], rot(null), full, EXERCISES, '2026-06-08');
    const b = generateWorkout([], rot(null), full, EXERCISES, '2026-06-08');
    expect(a).toEqual(b);
  });

  it('stamps the provided date', () => {
    const plan = generateWorkout([], rot(null), full, EXERCISES, '2026-06-08');
    expect(plan.date).toBe('2026-06-08');
  });
});
