import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Emphasis } from '../types';
import { mmkvStorage } from './mmkvStorage';

/**
 * Coach rotation state. `lastEmphasis` only moves when a COACHED workout
 * completes (see useActiveSession.completeWorkout) — never on viewing or
 * generating a plan — so a skipped day never "catches up". generateWorkout
 * reads `{ lastEmphasis, sessionCount }` and returns the next emphasis.
 */
interface RotationStore {
  lastEmphasis: Emphasis | null;
  sessionCount: number;
  advance: (emphasis: Emphasis) => void;
}

export const useRotation = create<RotationStore>()(
  persist(
    (set) => ({
      lastEmphasis: null,
      sessionCount: 0,
      advance: (emphasis) =>
        set((s) => ({ lastEmphasis: emphasis, sessionCount: s.sessionCount + 1 })),
    }),
    {
      name: 'rotation',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
