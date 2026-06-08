import { Exercise, UserEquipment } from '../types';
import { EXERCISES } from './exercises';
import { isAvailable } from './availability';

export function freestyleExerciseOptions(
  equipment: UserEquipment,
  allExercises: Exercise[] = EXERCISES
): Exercise[] {
  return allExercises.filter((ex) => isAvailable(ex, equipment));
}
