import { ImageSourcePropType } from 'react-native';
import { Exercise, MovementPattern } from '../types';

export interface IllustrationEntry {
  /** null until real art is dropped in — see assets/illustrations/README.md */
  source: ImageSourcePropType | null;
  /** 1–2 sentence coaching cue for this movement pattern. */
  formCue: string;
}

const ILLUSTRATION_MAP = {
  vertical_pull: {
    source: null,
    formCue:
      'Dead-hang, then drive elbows straight down toward your hips. Keep shoulders packed — no shrugging at the top.',
  },
  horizontal_pull: {
    source: null,
    formCue:
      'Retract the shoulder blades before you row. Pull the elbow past the ribcage; keep the torso rigid throughout.',
  },
  horizontal_push: {
    source: null,
    formCue:
      'Set the scapulae, then press — think "push your body away." Elbows at ~45° off the torso, not flared wide.',
  },
  dip: {
    source: null,
    formCue:
      'Slight forward lean for chest; upright for triceps. Lower until elbows hit 90° and press back up with control.',
  },
  vertical_push: {
    source: null,
    formCue:
      'Brace hard and squeeze the glutes before pressing. Lock out fully overhead; do not let the lower back arch.',
  },
  core: {
    source: null,
    formCue:
      'Breathe into the belly, then create 360° tension — ribs down, hips tucked. Resist movement; don\'t just hold position.',
  },
  squat: {
    source: null,
    formCue:
      'Spread the floor with your feet and sit between your knees. Keep the chest tall and heels down through the whole range.',
  },
  lunge: {
    source: null,
    formCue:
      'Step long enough that the shin stays vertical. Drive through the front heel to stand; keep the torso upright.',
  },
  hinge: {
    source: null,
    formCue:
      'Hips back, neutral spine, drive through the heels. The bell follows the hips — it does not swing via the arms.',
  },
  swing: {
    source: null,
    formCue:
      'Hike the bell back, snap the hips forward hard. The float is a by-product — power comes from the hip drive, not the arms.',
  },
  clean: {
    source: null,
    formCue:
      'Guide the bell in a tight arc close to the body. Catch it gently in the rack — do not let it crash onto the forearm.',
  },
  press: {
    source: null,
    formCue:
      'Pack the shoulder and create a shelf before you press. Lockout is full — wrist straight, elbow behind the ear.',
  },
  row: {
    source: null,
    formCue:
      'Anchor the non-working side; row the bell to the hip, not the armpit. Squeeze the lat at the top of each rep.',
  },
  getup: {
    source: null,
    formCue:
      'Keep the bell arm vertical and your eyes on the bell at all times. Move one step at a time; there is no rushing a get-up.',
  },
  snatch: {
    source: null,
    formCue:
      'Hike and then drive explosively. As the bell rises, punch through the top so the handle rotates smoothly around the hand.',
  },
  carry: {
    source: null,
    formCue:
      'Walk tall — ribs down, shoulder packed, no lateral lean. Short, deliberate steps; treat every stride as a plank.',
  },
  full_body: {
    source: null,
    formCue:
      'Link the segments: legs initiate, core transfers, upper body expresses. Every rep should feel connected from foot to hand.',
  },
} as const satisfies Record<MovementPattern, IllustrationEntry>;

/** Returns the illustration entry for the exercise's primary movement pattern. */
export function illustrationForExercise(exercise: Exercise): IllustrationEntry {
  const pattern = exercise.movementPatterns[0];
  if (pattern && pattern in ILLUSTRATION_MAP) {
    return ILLUSTRATION_MAP[pattern as MovementPattern];
  }
  // Generic fallback — should never fire given the catalog is fully typed
  return {
    source: null,
    formCue: 'Move with control through the full range of motion on every rep.',
  };
}

export { ILLUSTRATION_MAP };
