import { WorkoutSession, ExerciseLog } from '../types';

/**
 * The most recent COMPLETED log for an exercise that actually has sets — i.e.
 * "what you did last time, to beat." Pure so it's unit-testable without MMKV;
 * the store method delegates to this.
 *
 * Sorts by `completedAt` descending rather than trusting array order. The store
 * happens to prepend (newest-first) today, but a v1.1 JSON import would reorder
 * the array and silently regress every target — so recency is computed, not assumed.
 * Skips empty/0-set logs (a session can be finished without logging every exercise).
 */
export function findLastLogFor(
  sessions: WorkoutSession[],
  exerciseId: string
): ExerciseLog | undefined {
  return sessions
    .filter((s) => s.isCompleted)
    .slice()
    .sort((a, b) => recencyKey(b).localeCompare(recencyKey(a)))
    .map((s) => s.exerciseLogs.find((l) => l.exerciseId === exerciseId))
    .find((log): log is ExerciseLog => log != null && log.sets.length > 0);
}

function recencyKey(s: WorkoutSession): string {
  return s.completedAt ?? s.date;
}
