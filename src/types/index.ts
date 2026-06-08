export type EquipmentItem =
  | 'pull-up-bar'
  | 'dip-bars'
  | 'gymnastics-rings'
  | 'bands'
  | 'kettlebell-20kg'
  | 'kettlebell-24kg'
  | 'bodyweight';

export interface KettlebellWeight {
  weightKg: number;
  quantity: number;
}

export interface UserEquipment {
  items: EquipmentItem[];
  kettlebells: KettlebellWeight[];
}

export const DEFAULT_EQUIPMENT: UserEquipment = {
  items: [
    'pull-up-bar',
    'dip-bars',
    'gymnastics-rings',
    'bands',
    'kettlebell-20kg',
    'kettlebell-24kg',
    'bodyweight',
  ],
  kettlebells: [
    { weightKg: 20, quantity: 1 },
    { weightKg: 24, quantity: 2 },
  ],
};

export type Emphasis = 'strength' | 'skill' | 'conditioning';

export interface Exercise {
  id: string;
  name: string;
  category: 'calisthenics' | 'kettlebell';
  muscleGroups: string[];
  type: 'reps' | 'time' | 'emom';
  equipment: EquipmentItem[];
  defaultRestSeconds: number;
  /**
   * Which training focuses this exercise serves. The coach rotates emphasis
   * day to day and selects exercises whose `emphasis` includes today's focus.
   * An exercise may serve more than one (e.g. kb-snatch = strength + conditioning).
   * Tags are a tuning knob — adjust by feel after real use.
   */
  emphasis: Emphasis[];
}

/**
 * A single prescribed exercise inside a generated PlannedWorkout. Produced by
 * the coach engine; rendered as a target card and flowed into SetLogger as the
 * set-1 placeholder. `exerciseId` may differ from the slot the engine started
 * with when a ladder promotion fires (the level-up moment).
 */
export interface ExerciseTarget {
  exerciseId: string;
  sets: number;
  targetReps?: number; // type: 'reps'
  targetSeconds?: number; // type: 'time'
  weightKg?: number; // which kettlebell, when applicable
  emomMinutes?: number; // type: 'emom' (fixed prescription in v1)
  reason: string; // "Beat last: 4×8 → 4×9" / "Leveled up: Push-Up → Ring Push-Up"
}

/** Today's generated session. Held by useTodayPlan, keyed by local dayKey(). */
export interface PlannedWorkout {
  date: string; // local YYYY-MM-DD (dayKey)
  emphasis: Emphasis;
  targets: ExerciseTarget[];
}

export interface Set {
  reps?: number;
  weight?: number;
  duration?: number;
  completedAt: string;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: Set[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  exerciseLogs: ExerciseLog[];
  isCompleted: boolean;
  notes?: string;
}

export interface PersonalRecord {
  exerciseId: string;
  maxWeight: number;
  maxReps: number;
  maxDuration: number;
  achievedAt: string;
}
