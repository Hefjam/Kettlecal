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
  /** True logging position. Preview navigation uses viewedExerciseIndex. */
  currentExerciseIndex: number;
  viewedExerciseIndex: number;
  isRestTimerActive: boolean;
  restSeconds: number;
  restEndsAt: number | null;
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
  /**
   * Replace the exercise at `index` with `newTarget`. If the exerciseId changes
   * (ladder swap or mid-workout swap), the log entry is replaced and sets cleared.
   * If the exerciseId is the same (e.g. heavier-KB escalation), only the target
   * is updated — existing sets are preserved.
   * Optional `reason` is stored as `swapReason` on the log entry.
   */
  swapExercise: (index: number, newTarget: ExerciseTarget, reason?: string) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  editSet: (exerciseId: string, setIndex: number, patch: { reps?: number; weight?: number; duration?: number }) => void;
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
      viewedExerciseIndex: 0,
      isRestTimerActive: false,
      restSeconds: 60,
      restEndsAt: null,
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
        set({
          session,
          currentExerciseIndex: 0,
          viewedExerciseIndex: 0,
          targets,
          planEmphasis,
          isRestTimerActive: false,
          restEndsAt: null,
        });
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
          const exerciseIndex = s.session.exerciseLogs.findIndex((log) => log.exerciseId === exerciseId);
          const target = s.targets[exerciseId];
          const loggedSetCount =
            updatedLogs.find((log) => log.exerciseId === exerciseId)?.sets.length ?? 0;
          const didFinishPrescription = target != null && loggedSetCount >= target.sets;
          const nextIndex =
            exerciseIndex >= 0
              ? Math.min(exerciseIndex + 1, s.session.exerciseLogs.length - 1)
              : s.currentExerciseIndex;
          const shouldAutoAdvance =
            didFinishPrescription &&
            exerciseIndex === s.currentExerciseIndex &&
            exerciseIndex < s.session.exerciseLogs.length - 1;
          const restSeconds = exercise?.defaultRestSeconds ?? 60;
          const startRest = !didFinishPrescription || shouldAutoAdvance;
          return {
            session: { ...s.session, exerciseLogs: updatedLogs },
            currentExerciseIndex: shouldAutoAdvance ? nextIndex : s.currentExerciseIndex,
            viewedExerciseIndex: shouldAutoAdvance ? nextIndex : s.viewedExerciseIndex,
            isRestTimerActive: startRest,
            restSeconds,
            restEndsAt: startRest ? Date.now() + restSeconds * 1000 : null,
          };
        }),

      swapExercise: (index, newTarget, reason) =>
        set((s) => {
          if (!s.session) return s;
          const oldLog = s.session.exerciseLogs[index];
          if (!oldLog) return s;
          const isNewExercise = oldLog.exerciseId !== newTarget.exerciseId;
          const updatedLogs = isNewExercise
            ? s.session.exerciseLogs.map((log, i) => {
                if (i !== index) return log;
                const entry: ExerciseLog = { exerciseId: newTarget.exerciseId, sets: [] };
                if (reason !== undefined) entry.swapReason = reason;
                return entry;
              })
            : s.session.exerciseLogs.map((log, i) => {
                if (i !== index) return log;
                if (reason !== undefined) return { ...log, swapReason: reason };
                return log;
              });
          const updatedTargets = { ...s.targets };
          if (isNewExercise) delete updatedTargets[oldLog.exerciseId];
          updatedTargets[newTarget.exerciseId] = newTarget;
          return {
            session: { ...s.session, exerciseLogs: updatedLogs },
            targets: updatedTargets,
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
          viewedExerciseIndex: Math.min(
            s.viewedExerciseIndex + 1,
            (s.session?.exerciseLogs.length ?? 1) - 1
          ),
        })),

      prevExercise: () =>
        set((s) => ({
          viewedExerciseIndex: Math.max(s.viewedExerciseIndex - 1, 0),
        })),

      setCurrentExercise: (index) =>
        set((s) => ({
          currentExerciseIndex: Math.max(
            0,
            Math.min(index, (s.session?.exerciseLogs.length ?? 1) - 1)
          ),
          viewedExerciseIndex: Math.max(
            0,
            Math.min(index, (s.session?.exerciseLogs.length ?? 1) - 1)
          ),
          isRestTimerActive: false,
          restEndsAt: null,
        })),

      removeSet: (exerciseId, setIndex) =>
        set((s) => {
          if (!s.session) return s;
          const log = s.session.exerciseLogs.find((l) => l.exerciseId === exerciseId);
          if (!log || setIndex < 0 || setIndex >= log.sets.length) return s;
          return {
            session: {
              ...s.session,
              exerciseLogs: s.session.exerciseLogs.map((l) =>
                l.exerciseId === exerciseId
                  ? { ...l, sets: l.sets.filter((_, i) => i !== setIndex) }
                  : l
              ),
            },
          };
        }),

      editSet: (exerciseId, setIndex, patch) =>
        set((s) => {
          if (!s.session) return s;
          const log = s.session.exerciseLogs.find((l) => l.exerciseId === exerciseId);
          if (!log || setIndex < 0 || setIndex >= log.sets.length) return s;
          return {
            session: {
              ...s.session,
              exerciseLogs: s.session.exerciseLogs.map((l) =>
                l.exerciseId === exerciseId
                  ? {
                      ...l,
                      sets: l.sets.map((s, i) =>
                        i === setIndex ? { ...s, ...patch } : s
                      ),
                    }
                  : l
              ),
            },
          };
        }),

      startRestTimer: (seconds) =>
        set((s) => ({
          isRestTimerActive: true,
          restSeconds: seconds ?? s.restSeconds,
          restEndsAt: Date.now() + (seconds ?? s.restSeconds) * 1000,
        })),

      stopRestTimer: () => set({ isRestTimerActive: false, restEndsAt: null }),

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
          viewedExerciseIndex: 0,
          isRestTimerActive: false,
          restEndsAt: null,
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
          viewedExerciseIndex: 0,
          isRestTimerActive: false,
          restEndsAt: null,
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
        viewedExerciseIndex: state.viewedExerciseIndex,
        isRestTimerActive: state.isRestTimerActive,
        restSeconds: state.restSeconds,
        restEndsAt: state.restEndsAt,
      }),
    }
  )
);
