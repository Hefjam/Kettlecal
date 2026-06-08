import { Exercise, EquipmentItem, UserEquipment } from '../types';

/**
 * Single source of truth for "can the user do this exercise with their gear".
 * Used by the coach engine, the Freestyle picker, and the Today screen.
 *
 * An exercise's `equipment` array is a list of ALTERNATIVES (any one suffices),
 * e.g. l-sit needs dip-bars OR rings; kb-swing needs a 20 OR a 24. So an
 * exercise is available when the user owns AT LEAST ONE listed item.
 *
 * Kettlebell tokens (`kettlebell-20kg`, `kettlebell-24kg`) are "owned" only when
 * a kettlebell of that weight actually exists in `equipment.kettlebells` — not
 * merely when the token is toggled in `items`. This is the one place that rule
 * lives, so it can grow (e.g. double-KB quantity) without drifting across call sites.
 */
export function isAvailable(exercise: Exercise, equipment: UserEquipment): boolean {
  return exercise.equipment.some((token) => ownsItem(token, equipment));
}

export function ownsItem(token: EquipmentItem, equipment: UserEquipment): boolean {
  const weight = kbTokenToWeight(token);
  if (weight != null) return ownsKettlebell(weight, equipment);
  return equipment.items.includes(token);
}

/** Maps a kettlebell equipment token to its weight in kg, or null if not a KB token. */
export function kbTokenToWeight(token: EquipmentItem): number | null {
  const match = /^kettlebell-(\d+)kg$/.exec(token);
  return match ? Number(match[1]) : null;
}

export function ownsKettlebell(weightKg: number, equipment: UserEquipment): boolean {
  return equipment.kettlebells.some((k) => k.weightKg === weightKg && k.quantity > 0);
}

/**
 * The kettlebell weights an exercise can be performed with that the user owns,
 * ascending. Drives baseline weight (lightest) and the next-heavier weight jump.
 */
export function ownedKbWeightsFor(exercise: Exercise, equipment: UserEquipment): number[] {
  const weights = exercise.equipment
    .map(kbTokenToWeight)
    .filter((w): w is number => w != null && ownsKettlebell(w, equipment));
  return Array.from(new Set(weights)).sort((a, b) => a - b);
}
