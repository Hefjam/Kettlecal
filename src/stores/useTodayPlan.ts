import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PlannedWorkout, ExerciseTarget } from '../types';
import { mmkvStorage } from './mmkvStorage';

/**
 * Holds today's generated plan, persisted and keyed by date (the plan carries
 * its own `date` = dayKey()). The Today screen generates ONCE per day and stores
 * it here; re-opens read the stored plan so per-card swaps survive backgrounding.
 * Cleared when the coached session completes (useActiveSession.completeWorkout).
 */
interface TodayPlanStore {
  plan: PlannedWorkout | null;
  setPlan: (plan: PlannedWorkout) => void;
  /** Replace the target at `index` (a per-card swap). Mutates the stored plan. */
  swapTarget: (index: number, target: ExerciseTarget) => void;
  clear: () => void;
}

export const useTodayPlan = create<TodayPlanStore>()(
  persist(
    (set) => ({
      plan: null,
      setPlan: (plan) => set({ plan }),
      swapTarget: (index, target) =>
        set((s) => {
          if (!s.plan) return s;
          const targets = s.plan.targets.map((t, i) => (i === index ? target : t));
          return { plan: { ...s.plan, targets } };
        }),
      clear: () => set({ plan: null }),
    }),
    {
      name: 'today-plan',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
