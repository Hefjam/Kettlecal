import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const Typography = StyleSheet.create({
  display: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  h1: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 15,
    fontWeight: '500', // Semi-medium weight feels more premium in dark mode
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
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  // Monospace for numbers, timers, weights
  mono: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  monoLarge: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
  },
});

