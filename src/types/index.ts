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

export interface Exercise {
  id: string;
  name: string;
  category: 'calisthenics' | 'kettlebell';
  muscleGroups: string[];
  type: 'reps' | 'time' | 'emom';
  equipment: EquipmentItem[];
  defaultRestSeconds: number;
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
