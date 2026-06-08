import { describe, it, expect } from 'vitest';
import { freestyleExerciseOptions } from './freestyle';
import { DEFAULT_COACH_PROFILE, UserEquipment } from '../types';
import { EXERCISES } from './exercises';

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

describe('freestyleExerciseOptions', () => {
  it('keeps coach auto-pick restrictions manually selectable when equipment allows them', () => {
    const ids = freestyleExerciseOptions(full, EXERCISES).map((e) => e.id);
    for (const id of DEFAULT_COACH_PROFILE.restrictedAutoPickExerciseIds) {
      expect(ids).toContain(id);
    }
  });
});
