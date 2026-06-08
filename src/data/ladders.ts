import { Exercise, UserEquipment } from '../types';
import { isAvailable } from './availability';

/**
 * Minimal v1 progression ladders. Each chain is ordered easy → hard by exercise
 * id. When the user maxes the rep ceiling on a rung (and, for KB lifts, has no
 * heavier kettlebell to jump to), the coach promotes them to the next rung —
 * the "Leveled up" moment. Full ladder coverage is deferred to v2.
 *
 *   push-up → ring-push-up → dip → ring-dip   (bodyweight push)
 *   squat → pistol-squat                       (bodyweight legs)
 *   kb-press → kb-double-press                 (overhead)
 *   kb-goblet-squat → kb-front-squat → kb-double-front-squat
 *   kb-swing → kb-double-swing
 */
export const LADDERS: string[][] = [
  ['push-up', 'ring-push-up', 'dip', 'ring-dip'],
  ['squat', 'pistol-squat'],
  ['kb-press', 'kb-double-press'],
  ['kb-goblet-squat', 'kb-front-squat', 'kb-double-front-squat'],
  ['kb-swing', 'kb-double-swing'],
];

/**
 * The next ladder rung up from `exerciseId`, if one exists AND the user owns the
 * equipment for it. Returns undefined when the exercise is at the top of its
 * chain, is not in any chain, or the next rung needs gear the user lacks (the
 * engine then falls back to volume creep instead of promoting).
 */
export function nextRung(
  exerciseId: string,
  allExercises: Exercise[],
  equipment: UserEquipment
): Exercise | undefined {
  for (const chain of LADDERS) {
    const i = chain.indexOf(exerciseId);
    if (i === -1 || i === chain.length - 1) continue;
    const next = allExercises.find((e) => e.id === chain[i + 1]);
    if (next && isAvailable(next, equipment)) return next;
    return undefined; // next rung exists but isn't owned → no promotion
  }
  return undefined;
}
