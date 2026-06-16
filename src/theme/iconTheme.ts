import { Colors } from './colors';

export const IconTheme = {
  sizes: {
    nav: 30,
    equipment: 58,
    kettlebell: 64,
    action: 24,
    badge: 32,
  },
  state: {
    activeOpacity: 1,
    inactiveOpacity: 0.48,
    disabledOpacity: 0.32,
    pressedOpacity: 0.82,
  },
  glow: {
    active: {
      shadowColor: Colors.accent.primary,
      shadowOpacity: 0.55,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
      elevation: 6,
    },
    subtle: {
      shadowColor: Colors.accent.teal,
      shadowOpacity: 0.24,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: 3,
    },
  },
} as const;
