import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const Typography = StyleSheet.create({
  display: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text.primary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.text.secondary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Monospace for numbers, timers, weights
  mono: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  monoLarge: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
});
