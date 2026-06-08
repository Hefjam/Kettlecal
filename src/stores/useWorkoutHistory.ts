import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WorkoutSession, PersonalRecord, ExerciseLog } from '../types';
import { mmkvStorage } from './mmkvStorage';
import { findLastLogFor } from '../engine/history';
import { dayKey } from '../utils/dayKey';

interface WorkoutHistoryState {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  deleteSession: (id: string) => void;
  getPersonalRecords: () => Record<string, PersonalRecord>;
  getRecentSessions: (limit?: number) => WorkoutSession[];
  getWeeklyVolume: () => { date: string; totalReps: number; totalWeightKg: number }[];
  /** Most recent completed log for an exercise (what to beat) — drives the coach. */
  getLastLogFor: (exerciseId: string) => ExerciseLog | undefined;
}

export const useWorkoutHistory = create<WorkoutHistoryState>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (session) =>
        set((s) => ({
          sessions: [session, ...s.sessions],
        })),

      deleteSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((s) => s.id !== id),
        })),

      getPersonalRecords: () => {
        const prs: Record<string, PersonalRecord> = {};
        for (const session of get().sessions) {
          for (const log of session.exerciseLogs) {
            const existing = prs[log.exerciseId];
            for (const set of log.sets) {
              const maxWeight = set.weight ?? 0;
              const maxReps = set.reps ?? 0;
              const maxDuration = set.duration ?? 0;
              if (
                !existing ||
                maxWeight > existing.maxWeight ||
                maxReps > existing.maxReps ||
                maxDuration > existing.maxDuration
              ) {
                prs[log.exerciseId] = {
                  exerciseId: log.exerciseId,
                  maxWeight: Math.max(existing?.maxWeight ?? 0, maxWeight),
                  maxReps: Math.max(existing?.maxReps ?? 0, maxReps),
                  maxDuration: Math.max(existing?.maxDuration ?? 0, maxDuration),
                  achievedAt: set.completedAt,
                };
              }
            }
          }
        }
        return prs;
      },

      getRecentSessions: (limit = 10) => get().sessions.slice(0, limit),

      getLastLogFor: (exerciseId) => findLastLogFor(get().sessions, exerciseId),

      getWeeklyVolume: () => {
        const byDate: Record<string, { totalReps: number; totalWeightKg: number }> = {};
        for (const session of get().sessions) {
          const date = dayKey(new Date(session.date));
          if (!byDate[date]) byDate[date] = { totalReps: 0, totalWeightKg: 0 };
          for (const log of session.exerciseLogs) {
            for (const set of log.sets) {
              byDate[date].totalReps += set.reps ?? 0;
              byDate[date].totalWeightKg += (set.reps ?? 0) * (set.weight ?? 0);
            }
          }
        }
        return Object.entries(byDate)
          .map(([date, v]) => ({ date, ...v }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-14);
      },
    }),
    {
      name: 'workout-history',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
