import { describe, it, expect, beforeEach, vi } from 'vitest';

// react-native-mmkv is a native Nitro module the plain `node` test env can't
// transform; stub it so the persisted store module loads. (See the matching
// mock in useWorkoutHistory.test.ts.)
vi.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  return {
    createMMKV: () => ({
      set: (k: string, v: string) => store.set(k, v),
      getString: (k: string) => store.get(k),
      remove: (k: string) => store.delete(k),
    }),
  };
});

import { useEquipment } from './useEquipment';

describe('addKettlebell', () => {
  beforeEach(() => {
    useEquipment.setState((s) => ({ equipment: { ...s.equipment, kettlebells: [] } }));
  });

  it('appends a new weight', () => {
    useEquipment.getState().addKettlebell({ weightKg: 16, quantity: 1 });
    expect(useEquipment.getState().equipment.kettlebells).toEqual([{ weightKg: 16, quantity: 1 }]);
  });

  it('merges a duplicate weight by summing quantity (no second entry)', () => {
    const { addKettlebell } = useEquipment.getState();
    addKettlebell({ weightKg: 20, quantity: 1 });
    addKettlebell({ weightKg: 20, quantity: 2 });
    const kbs = useEquipment.getState().equipment.kettlebells;
    expect(kbs).toHaveLength(1); // not two colliding {weightKg:20} entries
    expect(kbs[0]).toEqual({ weightKg: 20, quantity: 3 });
  });

  it('keeps distinct weights separate', () => {
    const { addKettlebell } = useEquipment.getState();
    addKettlebell({ weightKg: 16, quantity: 1 });
    addKettlebell({ weightKg: 24, quantity: 1 });
    expect(useEquipment.getState().equipment.kettlebells.map((k) => k.weightKg)).toEqual([16, 24]);
  });
});

describe('removeKettlebell', () => {
  beforeEach(() => {
    useEquipment.setState((s) => ({ equipment: { ...s.equipment, kettlebells: [] } }));
  });

  it('removes only the targeted weight, leaving others intact', () => {
    const { addKettlebell, removeKettlebell } = useEquipment.getState();
    addKettlebell({ weightKg: 16, quantity: 1 });
    addKettlebell({ weightKg: 20, quantity: 1 });
    removeKettlebell(20);
    expect(useEquipment.getState().equipment.kettlebells).toEqual([{ weightKg: 16, quantity: 1 }]);
  });
});
