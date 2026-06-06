import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserEquipment, DEFAULT_EQUIPMENT, EquipmentItem, KettlebellWeight } from '../types';
import { mmkvStorage } from './mmkvStorage';

interface EquipmentState {
  equipment: UserEquipment;
  setEquipment: (equipment: UserEquipment) => void;
  addKettlebell: (kb: KettlebellWeight) => void;
  removeKettlebell: (weightKg: number) => void;
  toggleItem: (item: EquipmentItem) => void;
}

export const useEquipment = create<EquipmentState>()(
  persist(
    (set) => ({
      equipment: DEFAULT_EQUIPMENT,

      setEquipment: (equipment) => set({ equipment }),

      toggleItem: (item) =>
        set((s) => ({
          equipment: {
            ...s.equipment,
            items: s.equipment.items.includes(item)
              ? s.equipment.items.filter((i) => i !== item)
              : [...s.equipment.items, item],
          },
        })),

      addKettlebell: (kb) =>
        set((s) => ({
          equipment: {
            ...s.equipment,
            kettlebells: [...s.equipment.kettlebells, kb],
          },
        })),

      removeKettlebell: (weightKg) =>
        set((s) => ({
          equipment: {
            ...s.equipment,
            kettlebells: s.equipment.kettlebells.filter((k) => k.weightKg !== weightKg),
          },
        })),
    }),
    {
      name: 'equipment',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
