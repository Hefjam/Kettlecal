import { describe, it, expect } from 'vitest';
import { nextRung } from './ladders';
import { EXERCISES } from './exercises';
import { UserEquipment } from '../types';

const full: UserEquipment = {
  items: ['pull-up-bar', 'dip-bars', 'gymnastics-rings', 'bands', 'kettlebell-20kg', 'kettlebell-24kg', 'bodyweight'],
  kettlebells: [
    { weightKg: 20, quantity: 1 },
    { weightKg: 24, quantity: 2 },
  ],
};

const rung = (id: string, eq = full) => nextRung(id, EXERCISES, eq)?.id;

describe('full ladder coverage (v2)', () => {
  describe('pull chain: pull-up → ring-pull-up → muscle-up', () => {
    it('pull-up promotes to ring-pull-up', () => {
      expect(rung('pull-up')).toBe('ring-pull-up');
    });
    it('ring-pull-up promotes to muscle-up', () => {
      expect(rung('ring-pull-up')).toBe('muscle-up');
    });
    it('muscle-up is the top of its chain', () => {
      expect(rung('muscle-up')).toBeUndefined();
    });
  });

  describe('core-reps chain: hanging-knee-raise → toes-to-bar', () => {
    it('hanging-knee-raise promotes to toes-to-bar', () => {
      expect(rung('hanging-knee-raise')).toBe('toes-to-bar');
    });
    it('toes-to-bar is the top of its chain', () => {
      expect(rung('toes-to-bar')).toBeUndefined();
    });
  });

  describe('core-time chain: hollow-body → l-sit', () => {
    it('hollow-body promotes to l-sit', () => {
      expect(rung('hollow-body')).toBe('l-sit');
    });
    it('l-sit is the top of its chain', () => {
      expect(rung('l-sit')).toBeUndefined();
    });
  });

  describe('clean-press chain: kb-clean-press → kb-double-clean-press', () => {
    it('kb-clean-press promotes to kb-double-clean-press', () => {
      expect(rung('kb-clean-press')).toBe('kb-double-clean-press');
    });
    it('kb-double-clean-press is the top of its chain', () => {
      expect(rung('kb-double-clean-press')).toBeUndefined();
    });
  });
});
