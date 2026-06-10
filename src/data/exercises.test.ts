import { describe, it, expect } from 'vitest';
import { EXERCISES } from './exercises';
import { LADDERS } from './ladders';
import { DEFAULT_COACH_PROFILE, DEFAULT_EQUIPMENT, Emphasis, SessionLength } from '../types';
import { slotsForSessionLength } from '../engine/generateWorkout';
import { isAvailable } from './availability';

/**
 * Catalog integrity tests (added with the 2026-06-10 audit). These enforce the
 * tagging rules documented in exercises.ts so drift becomes a failing test,
 * not a silent skew in the Progress balance chart or a dead slot pool.
 */

const byId = new Map(EXERCISES.map((e) => [e.id, e]));
const EMPHASES: Emphasis[] = ['strength', 'skill', 'conditioning'];
const LENGTHS: SessionLength[] = ['short', 'standard', 'long'];

describe('catalog integrity', () => {
  it('has unique exercise ids', () => {
    expect(byId.size).toBe(EXERCISES.length);
  });

  it('every ladder rung exists in the catalog', () => {
    for (const chain of LADDERS) {
      for (const id of chain) {
        expect(byId.has(id), `ladder id ${id}`).toBe(true);
      }
    }
  });

  it('a ladder node lives in exactly one chain', () => {
    const seen = new Set<string>();
    for (const chain of LADDERS) {
      for (const id of chain) {
        expect(seen.has(id), `duplicate ladder node ${id}`).toBe(false);
        seen.add(id);
      }
    }
  });

  it('every default-restricted id exists in the catalog', () => {
    for (const id of DEFAULT_COACH_PROFILE.restrictedAutoPickExerciseIds) {
      expect(byId.has(id), `restricted id ${id}`).toBe(true);
    }
  });

  it('core-pattern exercises also list core as a muscle group (tagging rule)', () => {
    for (const e of EXERCISES) {
      if (e.movementPatterns.includes('core')) {
        expect(e.muscleGroups, `${e.id}: core pattern requires core muscle`).toContain('core');
      }
    }
  });

  it('every slot priority id exists in the catalog and matches its own slot', () => {
    for (const length of LENGTHS) {
      for (const emphasis of EMPHASES) {
        for (const slot of slotsForSessionLength(length, emphasis)) {
          for (const id of slot.priority) {
            const e = byId.get(id);
            expect(e, `${slot.id}/${emphasis}: unknown priority id ${id}`).toBeDefined();
            expect(slot.matches(e!), `${slot.id}/${emphasis}: ${id} does not match its slot`).toBe(true);
          }
        }
      }
    }
  });

  it('every slot pool has depth ≥ 2 under the default profile and full equipment', () => {
    const restricted = new Set(DEFAULT_COACH_PROFILE.restrictedAutoPickExerciseIds);
    const pickable = EXERCISES.filter(
      (e) => e.type !== 'emom' && isAvailable(e, DEFAULT_EQUIPMENT) && !restricted.has(e.id)
    );
    for (const length of LENGTHS) {
      for (const emphasis of EMPHASES) {
        for (const slot of slotsForSessionLength(length, emphasis)) {
          const depth = pickable.filter((e) => slot.matches(e)).length;
          expect(depth, `${slot.id} (${length}/${emphasis}) pool too thin`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('every non-restricted, non-EMOM exercise is reachable by some slot (no orphans)', () => {
    const restricted = new Set(DEFAULT_COACH_PROFILE.restrictedAutoPickExerciseIds);
    const slots = EMPHASES.flatMap((em) => slotsForSessionLength('long', em)).concat(
      EMPHASES.flatMap((em) => slotsForSessionLength('standard', em))
    );
    for (const e of EXERCISES) {
      if (e.type === 'emom' || restricted.has(e.id)) continue;
      const reachable = slots.some((s) => s.matches(e));
      expect(reachable, `${e.id} matches no slot — only reachable as filler`).toBe(true);
    }
  });

  it('accessories never match a main slot', () => {
    for (const length of LENGTHS) {
      for (const emphasis of EMPHASES) {
        for (const slot of slotsForSessionLength(length, emphasis)) {
          if (slot.id === 'conditioning-accessory') continue;
          for (const e of EXERCISES) {
            if (e.tier === 'accessory') {
              expect(slot.matches(e), `${e.id} matched main slot ${slot.id}`).toBe(false);
            }
          }
        }
      }
    }
  });
});
