import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  WorkoutSession,
  ExerciseLog,
  Set,
  ExerciseTarget,
  Emphasis,
  ExerciseFeedback,
} from '../types';
import { EXERCISES } from '../data/exercises';
import { useRotation } from './useRotation';
import { useTodayPlan } from './useTodayPlan';
import { mmkvStorage } from './mmkvStorage';

/** One exercise to start, optionally carrying the coach's prescribed target. */
export interface SessionExercise {
  exerciseId: string;
  target?: ExerciseTarget;
}

interface ActiveSessionState {
  session: WorkoutSession | null;
  currentExerciseIndex: number;
  isRestTimerActive: boolean;
  restSeconds: number;
  isEmomActive: boolean;
  emomDurationMinutes: number;
  /** Coach targets for this session, keyed by exerciseId (empty for freestyle). */
  targets: Record<string, ExerciseTarget>;
  /** Set when started from today's plan; drives rotation advance on completion. */
  planEmphasis: Emphasis | null;

  startWorkout: (exercises: SessionExercise[], planEmphasis?: Emphasis | null) => void;
  addSet: (exerciseId: string, newSet: Omit<Set, 'completedAt'>) => void;
  setExerciseFeedback: (exerciseId: string, feedback: ExerciseFeedback) => void;
  nextExercise: () => void;
  prevExercise: () => void;
  setCurrentExercise: (index: number) => void;
  startRestTimer: (seconds?: number) => void;
  stopRestTimer: () => void;
  startEmom: (minutes: number) => void;
  stopEmom: () => void;
  completeWorkout: () => WorkoutSession | null;
  abandonWorkout: () => void;
}

export const useActiveSession = create<ActiveSessionState>()(
  persist(
    (set, get) => ({
      session: null,
      currentExerciseIndex: 0,
      isRestTimerActive: false,
      restSeconds: 60,
      isEmomActive: false,
      emomDurationMinutes: 10,
      targets: {},
      planEmphasis: null,

      startWorkout: (exercises, planEmphasis = null) => {
        const now = new Date().toISOString();
        const targets: Record<string, ExerciseTarget> = {};
        for (const e of exercises) if (e.target) targets[e.exerciseId] = e.target;
        const session: WorkoutSession = {
          id: `session-${Date.now()}`,
          date: now,
          startedAt: now,
          exerciseLogs: exercises.map((e) => ({ exerciseId: e.exerciseId, sets: [] })),
          isCompleted: false,
        };
        set({ session, currentExerciseIndex: 0, targets, planEmphasis });
      },

      addSet: (exerciseId, newSet) =>
        set((s) => {
          if (!s.session) return s;
          const completedSet: Set = { ...newSet, completedAt: new Date().toISOString() };
          const exercise = EXERCISES.find((e) => e.id === exerciseId);
          const updatedLogs = s.session.exerciseLogs.map((log) =>
            log.exerciseId === exerciseId
              ? { ...log, sets: [...log.sets, completedSet] }
              : log
          );
          return {
            session: { ...s.session, exerciseLogs: updatedLogs },
            isRestTimerActive: true,
            restSeconds: exercise?.defaultRestSeconds ?? 60,
          };
        }),

      setExerciseFeedback: (exerciseId, feedback) =>
        set((s) => {
          if (!s.session) return s;
          return {
            session: {
              ...s.session,
              exerciseLogs: s.session.exerciseLogs.map((log) =>
                log.exerciseId === exerciseId ? { ...log, feedback } : log
              ),
            },
          };
        }),

      nextExercise: () =>
        set((s) => ({
          currentExerciseIndex: Math.min(
            s.currentExerciseIndex + 1,
            (s.session?.exerciseLogs.length ?? 1) - 1
          ),
          isRestTimerActive: false,
        })),

      prevExercise: () =>
        set((s) => ({
          currentExerciseIndex: Math.max(s.currentExerciseIndex - 1, 0),
          isRestTimerActive: false,
        })),

      setCurrentExercise: (index) => set({ currentExerciseIndex: index, isRestTimerActive: false }),

      startRestTimer: (seconds) =>
        set((s) => ({
          isRestTimerActive: true,
          restSeconds: seconds ?? s.restSeconds,
        })),

      stopRestTimer: () => set({ isRestTimerActive: false }),

      startEmom: (minutes) => set({ isEmomActive: true, emomDurationMinutes: minutes }),

      stopEmom: () => set({ isEmomActive: false }),

      completeWorkout: () => {
        const { session, planEmphasis } = get();
        if (!session) return null;
        const now = new Date().toISOString();
        const completed: WorkoutSession = {
          ...session,
          completedAt: now,
          durationMs: Date.now() - new Date(session.startedAt).getTime(),
          isCompleted: true,
        };
        // Advance rotation + clear today's plan only for a COACHED session (one
        // started from today's plan). Freestyle sessions don't move the cycle.
        if (planEmphasis) {
          useRotation.getState().advance(planEmphasis);
          useTodayPlan.getState().clear();
        }
        set({
          session: null,
          currentExerciseIndex: 0,
          isRestTimerActive: false,
          isEmomActive: false,
          targets: {},
          planEmphasis: null,
        });
        return completed;
      },

      abandonWorkout: () =>
        set({
          session: null,
          currentExerciseIndex: 0,
          isRestTimerActive: false,
          isEmomActive: false,
          targets: {},
          planEmphasis: null,
        }),
    }),
    {
      name: 'active-session',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        session: state.session,
        targets: state.targets,
        planEmphasis: state.planEmphasis,
        currentExerciseIndex: state.currentExerciseIndex,
      }),
    }
  )
);
