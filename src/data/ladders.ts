import { Exercise, UserEquipment } from '../types';
import { isAvailable } from './availability';

/**
 * Progression ladders. Each chain is ordered easy → hard by exercise id. When
 * the user maxes the rep ceiling on a rung (and, for KB lifts, has no heavier
 * kettlebell to jump to), the coach promotes them to the next rung — the
 * "Leveled up" moment.
 *
 * v1 shipped only the obvious chains; v2 extends coverage to the remaining
 * sensible progressions in the catalog. A node lives in exactly one chain
 * (`nextRung` takes the first match), so we only chain where there is a single
 * unambiguous "next harder variation that the user already owns the gear for".
 * Movements with no clearly-harder in-catalog successor (chin-up, pike-push-up,
 * get-up, snatch, rdl, lunges, carries) are deliberately left standalone rather
 * than inventing a progression — the engine falls back to volume creep for those.
 *
 *   push-up → ring-push-up → dip → ring-dip      (bodyweight push)
 *   squat → ring-assisted-pistol → pistol-squat  (bodyweight legs; assisted
 *                                                 rung bridges the old chasm) [v3]
 *   pull-up → ring-pull-up → muscle-up            (vertical pull)   [v2]
 *   hanging-knee-raise → hanging-leg-raise → toes-to-bar  (hanging core) [v3]
 *   hollow-body → l-sit                           (timed core)      [v2]
 *   kb-press → kb-double-press                    (overhead)
 *   kb-goblet-squat → kb-front-squat → kb-double-front-squat
 *   kb-swing → kb-double-swing
 *   kb-row → kb-double-row                        (row)             [v3]
 *   kb-clean-press → kb-double-clean-press        (full-body)       [v2]
 */
export const LADDERS: string[][] = [
  ['push-up', 'ring-push-up', 'dip', 'ring-dip'],
  ['squat', 'ring-assisted-pistol', 'pistol-squat'],
  ['pull-up', 'ring-pull-up', 'muscle-up'],
  ['hanging-knee-raise', 'hanging-leg-raise', 'toes-to-bar'],
  ['hollow-body', 'l-sit'],
  ['kb-press', 'kb-double-press'],
  ['kb-goblet-squat', 'kb-front-squat', 'kb-double-front-squat'],
  ['kb-swing', 'kb-double-swing'],
  ['kb-row', 'kb-double-row'],
  ['kb-clean-press', 'kb-double-clean-press'],
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
