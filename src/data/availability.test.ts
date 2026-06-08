import { describe, it, expect } from 'vitest';
import { isAvailable, ownedKbWeightsFor, kbTokenToWeight } from './availability';
import { EXERCISES } from './exercises';
import { UserEquipment } from '../types';

const ex = (id: string) => EXERCISES.find((e) => e.id === id)!;

const fullKb: UserEquipment = {
  items: ['pull-up-bar', 'dip-bars', 'gymnastics-rings', 'bands', 'kettlebell-20kg', 'kettlebell-24kg', 'bodyweight'],
  kettlebells: [
    { weightKg: 20, quantity: 1 },
    { weightKg: 24, quantity: 2 },
  ],
};

describe('isAvailable', () => {
  it('kettlebell-24kg requires actually owning a 24, not just the toggled item', () => {
    const itemToggledNoKb: UserEquipment = {
      items: ['kettlebell-24kg'],
      kettlebells: [], // no 24 owned
    };
    expect(isAvailable(ex('kb-double-press'), itemToggledNoKb)).toBe(false);
  });

  it('is true when a 24 is owned in kettlebells', () => {
    expect(isAvailable(ex('kb-double-press'), fullKb)).toBe(true);
  });

  it('treats the equipment list as alternatives (any one suffices)', () => {
    const ringsOnly: UserEquipment = { items: ['gymnastics-rings'], kettlebells: [] };
    expect(isAvailable(ex('l-sit'), ringsOnly)).toBe(true); // l-sit: dip-bars OR rings
    expect(isAvailable(ex('dip'), ringsOnly)).toBe(false); // dip needs dip-bars
  });
});

describe('ownedKbWeightsFor', () => {
  it('returns owned, exercise-usable weights ascending', () => {
    expect(ownedKbWeightsFor(ex('kb-swing'), fullKb)).toEqual([20, 24]);
  });
  it('double-only exercises resolve to just the 24', () => {
    expect(ownedKbWeightsFor(ex('kb-double-press'), fullKb)).toEqual([24]);
  });
});

describe('kbTokenToWeight', () => {
  it('parses kettlebell tokens, null otherwise', () => {
    expect(kbTokenToWeight('kettlebell-20kg')).toBe(20);
    expect(kbTokenToWeight('pull-up-bar')).toBeNull();
  });
});
