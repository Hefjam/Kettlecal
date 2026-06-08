import { describe, it, expect } from 'vitest';
import { findLastLogFor } from './history';
import { WorkoutSession, Set as WSet, ExerciseLog } from '../types';

const set = (reps: number, weight?: number): WSet => ({
  reps,
  weight,
  completedAt: '2026-01-01T00:00:00.000Z',
});

const log = (exerciseId: string, sets: WSet[]): ExerciseLog => ({ exerciseId, sets });

const session = (
  id: string,
  completedAt: string,
  logs: ExerciseLog[],
  isCompleted = true
): WorkoutSession => ({
  id,
  date: completedAt,
  startedAt: completedAt,
  completedAt,
  exerciseLogs: logs,
  isCompleted,
});

describe('findLastLogFor', () => {
  it('returns the most recent completed log by completedAt, regardless of array order', () => {
    // Array is intentionally OUT OF ORDER (older first) to prove we sort, not trust order.
    const sessions = [
      session('old', '2026-06-01T10:00:00Z', [log('kb-press', [set(5, 20)])]),
      session('new', '2026-06-07T10:00:00Z', [log('kb-press', [set(8, 20)])]),
      session('mid', '2026-06-04T10:00:00Z', [log('kb-press', [set(6, 20)])]),
    ];
    const found = findLastLogFor(sessions, 'kb-press');
    expect(found?.sets[0].reps).toBe(8); // from 'new'
  });

  it('skips sessions where the exercise has zero sets', () => {
    const sessions = [
      session('newer-empty', '2026-06-07T10:00:00Z', [log('kb-press', [])]),
      session('older-real', '2026-06-05T10:00:00Z', [log('kb-press', [set(7, 24)])]),
    ];
    const found = findLastLogFor(sessions, 'kb-press');
    expect(found?.sets[0].reps).toBe(7);
  });

  it('ignores incomplete sessions', () => {
    const sessions = [session('wip', '2026-06-09T10:00:00Z', [log('kb-press', [set(9, 24)])], false)];
    expect(findLastLogFor(sessions, 'kb-press')).toBeUndefined();
  });

  it('returns undefined when no history exists for the exercise', () => {
    expect(findLastLogFor([], 'kb-press')).toBeUndefined();
  });
});
