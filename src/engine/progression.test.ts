import { describe, it, expect } from 'vitest';
import { buildTarget, ceilingHit, topNMin } from './progression';
import { EXERCISES } from '../data/exercises';
import { Set as WSet, DEFAULT_COACH_PROFILE, ExerciseLog, UserEquipment } from '../types';

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
// Auto-adjust is opt-in (off by default), so the high-RPE "hold" path only
// fires when the profile has it enabled.
const enabledProfile = {
  ...DEFAULT_COACH_PROFILE,
  autoAdjust: { ...DEFAULT_COACH_PROFILE.autoAdjust, enabled: true },
};
const THold = (id: string, lastLog: ExerciseLog | undefined, eq = full) =>
  buildTarget(ex(id), lastLog, eq, EXERCISES, [], enabledProfile);

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
    // kb-rdl is deliberately standalone (no chain in LADDERS).
    const t = T('kb-rdl', log('kb-rdl', [set(8, 24), set(8, 24), set(8, 24), set(8, 24), set(8, 24)]));
    expect(t).toMatchObject({ exerciseId: 'kb-rdl', weightKg: 24, targetReps: 9 });
  });

  it('row chain (v3): kb-row at the top KB ceiling promotes to kb-double-row', () => {
    const t = T('kb-row', log('kb-row', [set(8, 24), set(8, 24), set(8, 24), set(8, 24), set(8, 24)]));
    expect(t.exerciseId).toBe('kb-double-row');
    expect(t.reason).toMatch(/Leveled up/);
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

  it('high RPE feedback holds instead of jumping weight or ladder', () => {
    const last = log('kb-press', [set(8, 20), set(8, 20), set(8, 20), set(8, 20), set(8, 20)]);
    last.feedback = { rpe: 9 };
    const t = THold('kb-press', last);
    expect(t).toMatchObject({ exerciseId: 'kb-press', weightKg: 20, targetReps: 8 });
    expect(t.reason).toMatch(/high effort/i);
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

  it('high RPE feedback holds instead of promoting a bodyweight ladder', () => {
    const last = log('push-up', [set(12), set(12), set(12), set(12)]);
    last.feedback = { rpe: 9 };
    const t = THold('push-up', last);
    expect(t).toMatchObject({ exerciseId: 'push-up', targetReps: 12 });
    expect(t.reason).toMatch(/high effort/i);
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

describe('auto-deload (v2)', () => {
  // A "stall session" = best working set at the current weight fell below repMin
  // (5 for KB). `recentLogs` is the recent completed history, newest-first.
  const TD = (id: string, recentLogs: ExerciseLog[], eq = full) =>
    buildTarget(ex(id), recentLogs[0], eq, EXERCISES, recentLogs);

  const stall = (id: string, weight: number) =>
    log(id, [set(4, weight), set(4, weight), set(4, weight), set(4, weight), set(4, weight)]);
  const ok = (id: string, weight: number) =>
    log(id, [set(6, weight), set(6, weight), set(6, weight), set(6, weight), set(6, weight)]);

  it('3 consecutive stalls at 24kg → deload to 20kg, reset to repMin', () => {
    const t = TD('kb-press', [stall('kb-press', 24), stall('kb-press', 24), stall('kb-press', 24)]);
    expect(t).toMatchObject({ exerciseId: 'kb-press', weightKg: 20, targetReps: 5 });
    expect(t.reason).toMatch(/Deload/i);
  });

  it('only 2 stalls → no deload (falls through to hold/+1)', () => {
    const t = TD('kb-press', [stall('kb-press', 24), stall('kb-press', 24)]);
    expect(t.weightKg).toBe(24);
    expect(t.reason).not.toMatch(/Deload/i);
  });

  it('a good session inside the window breaks the streak → no deload', () => {
    const t = TD('kb-press', [stall('kb-press', 24), ok('kb-press', 24), stall('kb-press', 24)]);
    expect(t.weightKg).toBe(24);
    expect(t.reason).not.toMatch(/Deload/i);
  });

  it('stalls at a different weight do not count toward the current-weight streak', () => {
    const t = TD('kb-press', [stall('kb-press', 24), stall('kb-press', 20), stall('kb-press', 24)]);
    expect(t.reason).not.toMatch(/Deload/i);
  });

  it('3 stalls at the lightest KB (20kg) → drop reps by repDrop, no lighter KB', () => {
    const t = TD('kb-press', [stall('kb-press', 20), stall('kb-press', 20), stall('kb-press', 20)]);
    // repMin 5 − repDrop 2 = 3, weight stays at the floor.
    expect(t).toMatchObject({ exerciseId: 'kb-press', weightKg: 20, targetReps: 3 });
    expect(t.reason).toMatch(/Deload/i);
  });

  it('bodyweight: 3 stalls → drop reps by repDrop below repMin', () => {
    const bwStall = log('push-up', [set(4), set(4), set(4), set(4)]);
    const t = TD('push-up', [bwStall, bwStall, bwStall]);
    // bodyweight repMin 6 − repDrop 2 = 4
    expect(t).toMatchObject({ exerciseId: 'push-up', targetReps: 4 });
    expect(t.reason).toMatch(/Deload/i);
  });

  it('default recentLogs ([]) → never deloads (backward-compatible 4-arg callers)', () => {
    const t = T('kb-press', stall('kb-press', 24));
    expect(t.reason).not.toMatch(/Deload/i);
  });
});

describe('EMOM progression (v2)', () => {
  // EMOM log = one set per worked minute, each carrying that minute's reps.
  const minutes = (id: string, perMinute: number[]): ExerciseLog =>
    log(id, perMinute.map((r) => set(r)));

  it('cold start → baseline reps/min for baseline minutes', () => {
    const t = T('kb-emom-swing', undefined);
    expect(t).toMatchObject({ exerciseId: 'kb-emom-swing', targetReps: 10, emomMinutes: 10 });
    expect(t.reason).toMatch(/EMOM/);
  });

  it('held every minute at baseline → advance reps/min by repStep', () => {
    // 10 minutes, all 10 reps held → bump to 11 reps/min, minutes unchanged.
    const t = T('kb-emom-swing', minutes('kb-emom-swing', Array(10).fill(10)));
    expect(t).toMatchObject({ targetReps: 11, emomMinutes: 10 });
    expect(t.reason).toMatch(/reps\/min/);
  });

  it('a minute dropped off → hold at the sustained floor (weakest minute)', () => {
    // held 10 for nine minutes, faded to 8 on the last → did not sustain 10.
    const t = T('kb-emom-swing', minutes('kb-emom-swing', [10, 10, 10, 10, 10, 10, 10, 10, 10, 8]));
    expect(t.targetReps).toBe(8);
    expect(t.emomMinutes).toBe(10);
    expect(t.reason).toMatch(/Hold/i);
  });

  it('at the rep/min ceiling and sustained → add a minute, reset reps/min to baseline', () => {
    // sustained 15 (repMax) for 10 min → graduate to 11 min at baseline reps.
    const t = T('kb-emom-swing', minutes('kb-emom-swing', Array(10).fill(15)));
    expect(t).toMatchObject({ targetReps: 10, emomMinutes: 11 });
    expect(t.reason).toMatch(/min/);
  });

  it('reps/min never exceeds repMax', () => {
    const t = T('kb-emom-swing', minutes('kb-emom-swing', Array(10).fill(14)));
    expect(t.targetReps).toBeLessThanOrEqual(15);
  });

  it('minutes never exceed maxMinutes', () => {
    const t = T('kb-emom-swing', minutes('kb-emom-swing', Array(20).fill(15)));
    expect(t.emomMinutes).toBeLessThanOrEqual(20);
  });
});
