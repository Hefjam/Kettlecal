import { create } from 'zustand';
import { WorkoutSession, ExerciseLog, Set } from '../types';
import { EXERCISES } from '../data/exercises';

interface ActiveSessionState {
  session: WorkoutSession | null;
  currentExerciseIndex: number;
  isRestTimerActive: boolean;
  restSeconds: number;
  isEmomActive: boolean;
  emomDurationMinutes: number;

  startWorkout: (exerciseIds: string[]) => void;
  addSet: (exerciseId: string, newSet: Omit<Set, 'completedAt'>) => void;
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

export const useActiveSession = create<ActiveSessionState>()((set, get) => ({
  session: null,
  currentExerciseIndex: 0,
  isRestTimerActive: false,
  restSeconds: 60,
  isEmomActive: false,
  emomDurationMinutes: 10,

  startWorkout: (exerciseIds) => {
    const now = new Date().toISOString();
    const session: WorkoutSession = {
      id: `session-${Date.now()}`,
      date: now,
      startedAt: now,
      exerciseLogs: exerciseIds.map((id) => ({ exerciseId: id, sets: [] })),
      isCompleted: false,
    };
    set({ session, currentExerciseIndex: 0 });
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
    const { session } = get();
    if (!session) return null;
    const now = new Date().toISOString();
    const completed: WorkoutSession = {
      ...session,
      completedAt: now,
      durationMs: Date.now() - new Date(session.startedAt).getTime(),
      isCompleted: true,
    };
    set({ session: null, currentExerciseIndex: 0, isRestTimerActive: false, isEmomActive: false });
    return completed;
  },

  abandonWorkout: () =>
    set({ session: null, currentExerciseIndex: 0, isRestTimerActive: false, isEmomActive: false }),
}));
