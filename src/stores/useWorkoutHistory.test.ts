// Pin the runner timezone to a US zone (UTC-4/UTC-5) BEFORE anything constructs
// a Date, so the local-vs-UTC distinction is asserted deterministically on any
// machine (the CI runner here happens to be Europe/London, i.e. east of UTC, so
// we cannot rely on the ambient zone to surface the bug). Node applies TZ lazily
// per Date call on this platform, so setting it at module load is sufficient.
process.env.TZ = 'America/New_York';

import { describe, it, expect, beforeEach, vi } from 'vitest';

// react-native-mmkv is a native Nitro module with source the Vite/Rollup parser
// cannot transform under the plain `node` test environment. The store imports it
// only for the persist() backing store, which is irrelevant to getWeeklyVolume.
// Mock it with an in-memory stub so the store module loads in tests. (Hoisted
// above the store import by Vitest.)
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

import { useWorkoutHistory } from './useWorkoutHistory';
import { WorkoutSession } from '../types';

function session(overrides: Partial<WorkoutSession>): WorkoutSession {
  return {
    id: overrides.id ?? 'sess-1',
    date: overrides.date ?? '2026-06-08T12:00:00.000Z',
    startedAt: overrides.startedAt ?? overrides.date ?? '2026-06-08T12:00:00.000Z',
    completedAt: overrides.completedAt,
    exerciseLogs: overrides.exerciseLogs ?? [
      { exerciseId: 'pushup', sets: [{ reps: 10, weight: 0, completedAt: '2026-06-08T12:00:00.000Z' }] },
    ],
    isCompleted: overrides.isCompleted ?? true,
    notes: overrides.notes,
  };
}

describe('getWeeklyVolume', () => {
  beforeEach(() => {
    useWorkoutHistory.setState({ sessions: [] });
  });

  it('buckets a late-evening-local session by LOCAL day, not UTC day', () => {
    // 2026-06-08T02:30:00Z is 2026-06-07 22:30 local in America/New_York (UTC-4 in June).
    // The UTC slice of this ISO string is "2026-06-08" (the bug); the correct local
    // bucket is "2026-06-07". This assertion fails on the UTC implementation.
    useWorkoutHistory.setState({
      sessions: [
        session({
          id: 'late-evening',
          date: '2026-06-08T02:30:00.000Z',
          exerciseLogs: [
            { exerciseId: 'pushup', sets: [{ reps: 5, weight: 20, completedAt: '2026-06-08T02:30:00.000Z' }] },
          ],
        }),
      ],
    });

    const volume = useWorkoutHistory.getState().getWeeklyVolume();

    expect(volume).toHaveLength(1);
    expect(volume[0].date).toBe('2026-06-07');
    expect(volume[0].date).not.toBe('2026-06-08'); // would be the UTC (buggy) bucket
    expect(volume[0].totalReps).toBe(5);
    expect(volume[0].totalWeightKg).toBe(100); // 5 reps * 20kg
  });

  it('merges two sessions that fall on the same LOCAL day but different UTC days', () => {
    // Both of these are the evening of 2026-06-07 in New York, but straddle the
    // UTC midnight boundary (one before, one after), so UTC bucketing would split
    // them into two separate days.
    useWorkoutHistory.setState({
      sessions: [
        session({
          id: 'before-utc-midnight',
          date: '2026-06-07T23:30:00.000Z', // 19:30 local on the 7th
          exerciseLogs: [
            { exerciseId: 'pushup', sets: [{ reps: 10, weight: 0, completedAt: '2026-06-07T23:30:00.000Z' }] },
          ],
        }),
        session({
          id: 'after-utc-midnight',
          date: '2026-06-08T01:30:00.000Z', // 21:30 local on the 7th
          exerciseLogs: [
            { exerciseId: 'pushup', sets: [{ reps: 8, weight: 0, completedAt: '2026-06-08T01:30:00.000Z' }] },
          ],
        }),
      ],
    });

    const volume = useWorkoutHistory.getState().getWeeklyVolume();

    expect(volume).toHaveLength(1); // one local day, not two UTC days
    expect(volume[0].date).toBe('2026-06-07');
    expect(volume[0].totalReps).toBe(18);
  });

  it('preserves the return shape consumed by progress.tsx', () => {
    useWorkoutHistory.setState({
      sessions: [
        session({
          date: '2026-06-08T15:00:00.000Z',
          exerciseLogs: [
            { exerciseId: 'pushup', sets: [{ reps: 12, weight: 16, completedAt: '2026-06-08T15:00:00.000Z' }] },
          ],
        }),
      ],
    });

    const volume = useWorkoutHistory.getState().getWeeklyVolume();
    expect(volume[0]).toEqual({
      date: expect.any(String),
      totalReps: expect.any(Number),
      totalWeightKg: expect.any(Number),
    });
  });
});
