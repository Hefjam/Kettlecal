import { describe, it, expect } from 'vitest';
import { buildTarget, ceilingHit, topNMin } from './progression';
import { EXERCISES } from '../data/exercises';
import { Set as WSet, ExerciseLog, UserEquipment } from '../types';

const ex = (id: string) => EXERCISES.find((e) => e.id === id)!;
const set = (reps: number, weight?: number): WSet => ({ reps, weight, completedAt: '2026-06-01T00:00:00Z' });
const log = (exerciseId: string, sets: WSet[]): ExerciseLog => ({ exerciseId, sets });

const full: UserEquipment = {
  items: ['pull-up-bar', 'dip-bars', 'gymnastics-rings', 'bands', 'kettlebell-20kg', 'kettlebell-24kg', 'bodyweight'],
  kettlebells: [
    { weightKg: 20, quantity: 1 },
    { weightKg: 24, quantity: 2 },
  ],
};
const noRings: UserEquipment = {
  items: full.items.filter((i) => i !== 'gymnastics-rings'),
  kettlebells: full.kettlebells,
};

const T = (id: string, lastLog: ExerciseLog | undefined, eq = full) =>
  buildTarget(ex(id), lastLog, eq, EXERCISES);

describe('ceiling predicate (variable-length, uncapped sets)', () => {
  it('topNMin returns the nth-largest, -Infinity when too few sets', () => {
    expect(topNMin([8, 8, 8, 8, 8], 5)).toBe(8);
    expect(topNMin([8, 8, 8, 8], 5)).toBe(-Infinity);
  });
  it('ignores a junk back-off set (best N count)', () => {
    expect(ceilingHit([8, 8, 8, 8, 8, 3], 5, 8)).toBe(true);
  });
  it('needs at least targetSets sets', () => {
    expect(ceilingHit([8, 8, 8, 8], 5, 8)).toBe(false);
  });
  it('fails when the Nth-best set is below repMax', () => {
    expect(ceilingHit([8, 8, 8, 8, 6], 5, 8)).toBe(false);
  });
});

describe('fixed-KB progression', () => {
  it('cold start → baseline 5×5 at lightest owned weight', () => {
    const t = T('kb-press', undefined);
    expect(t).toMatchObject({ exerciseId: 'kb-press', sets: 5, targetReps: 5, weightKg: 20 });
  });

  it('below ceiling → +1 rep at the same weight', () => {
    const t = T('kb-press', log('kb-press', [set(6, 20), set(6, 20), set(6, 20), set(6, 20), set(6, 20)]));
    expect(t).toMatchObject({ weightKg: 20, targetReps: 7 });
  });

  it('hit ceiling with a heavier KB available → jump weight, reset reps', () => {
    const t = T('kb-press', log('kb-press', [set(8, 20), set(8, 20), set(8, 20), set(8, 20), set(8, 20)]));
    expect(t).toMatchObject({ exerciseId: 'kb-press', weightKg: 24, targetReps: 5 });
  });

  it('hit ceiling at the top KB, ladder rung exists → promote variation', () => {
    const t = T('kb-press', log('kb-press', [set(8, 24), set(8, 24), set(8, 24), set(8, 24), set(8, 24)]));
    expect(t.exerciseId).toBe('kb-double-press');
    expect(t.reason).toMatch(/Leveled up/);
  });

  it('hit ceiling, no heavier KB and no ladder rung → volume creep', () => {
    const t = T('kb-row', log('kb-row', [set(8, 24), set(8, 24), set(8, 24), set(8, 24), set(8, 24)]));
    expect(t).toMatchObject({ exerciseId: 'kb-row', weightKg: 24, targetReps: 9 });
  });

  it('CONFLICT: heavier KB AND ladder rung → weight-jump BEFORE ladder', () => {
    // Goblet at 20kg ceiling: a 24 exists, so jump weight — do NOT promote to front squat.
    const t = T('kb-goblet-squat', log('kb-goblet-squat', [set(8, 20), set(8, 20), set(8, 20), set(8, 20), set(8, 20)]));
    expect(t.exerciseId).toBe('kb-goblet-squat');
    expect(t.weightKg).toBe(24);
  });

  it('CONFLICT: at the top KB, ladder promotion finally fires', () => {
    const t = T('kb-goblet-squat', log('kb-goblet-squat', [set(8, 24), set(8, 24), set(8, 24), set(8, 24), set(8, 24)]));
    expect(t.exerciseId).toBe('kb-front-squat');
  });

  it('bad/incomplete day → holds at the ceiling rather than over-progressing', () => {
    const t = T('kb-press', log('kb-press', [set(8, 24), set(8, 24), set(8, 24), set(6, 24)]));
    expect(t).toMatchObject({ weightKg: 24, targetReps: 8 });
    expect(t.reason).toMatch(/Hold/);
  });
});

describe('bodyweight progression', () => {
  it('below ceiling → +1 rep', () => {
    const t = T('push-up', log('push-up', [set(8), set(8), set(8)]));
    expect(t).toMatchObject({ exerciseId: 'push-up', targetReps: 9 });
    expect(t.weightKg).toBeUndefined();
  });

  it('hit ceiling → ladder promote (push-up → ring-push-up)', () => {
    const t = T('push-up', log('push-up', [set(12), set(12), set(12), set(12)]));
    expect(t.exerciseId).toBe('ring-push-up');
    expect(t.targetReps).toBe(6);
    expect(t.reason).toMatch(/Leveled up/);
  });

  it('hit ceiling but next rung not owned → volume creep, no promotion', () => {
    const t = T('push-up', log('push-up', [set(12), set(12), set(12), set(12)]), noRings);
    expect(t).toMatchObject({ exerciseId: 'push-up', targetReps: 13 });
  });
});

describe('time progression', () => {
  it('cold start → baseline hold', () => {
    expect(T('hollow-body', undefined)).toMatchObject({ targetSeconds: 15 });
  });
  it('adds 5s to last best hold', () => {
    const t = T('hollow-body', log('hollow-body', [{ duration: 20, completedAt: 'x' }]));
    expect(t.targetSeconds).toBe(25);
  });
});
