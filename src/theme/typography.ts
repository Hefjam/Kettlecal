import { StyleSheet } from 'react-native';
import { Colors } from './colors';

// Loaded via useFonts in app/_layout.tsx
export const Fonts = {
  bungee: 'Bungee_400Regular',  // Headlines, greet
  anton: 'Anton_400Regular',    // Exercise names, labels
  vt323: 'VT323_400Regular',    // Prescriptions, timers, terminal text
} as const;

export const Typography = StyleSheet.create({
  display: {
    fontSize: 46,
    fontFamily: 'Bungee_400Regular',
    color: Colors.text.primary,
    lineHeight: 44,
    textTransform: 'uppercase',
  },
  h1: {
    fontSize: 28,
    fontFamily: 'Anton_400Regular',
    color: Colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  h2: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
    color: Colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Anton_400Regular',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  // VT323 for numbers, timers, prescriptions — terminal readout aesthetic
  mono: {
    fontSize: 24,
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    letterSpacing: 1,
    lineHeight: 22,
  },
  monoLarge: {
    fontSize: 56,
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    letterSpacing: 1,
    lineHeight: 52,
  },
});
