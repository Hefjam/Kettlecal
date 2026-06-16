import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { IconTheme } from '../theme/iconTheme';
import { Exercise } from '../types';
import { AppIcon, AppIconName } from './icons/AppIcons';
import { illustrationForExercise } from '../data/exerciseIllustrations';

/** Choose which existing brand icon to show when no illustration PNG is available. */
function fallbackIconName(exercise: Exercise): AppIconName {
  if (exercise.category === 'kettlebell') return 'kettlebell.generic';
  const primary = exercise.equipment[0];
  if (primary === 'pull-up-bar') return 'equipment.pullUpBar';
  if (primary === 'dip-bars') return 'equipment.dipBars';
  if (primary === 'gymnastics-rings') return 'equipment.rings';
  if (primary === 'bands') return 'equipment.bands';
  return 'equipment.bodyweight';
}

/** Humanise a snake_case movement pattern label, e.g. "vertical_pull" → "VERTICAL PULL". */
function humanisePattern(pattern: string): string {
  return pattern.replace(/_/g, ' ').toUpperCase();
}

interface ExerciseIllustrationProps {
  exercise: Exercise;
}

export function ExerciseIllustration({ exercise }: ExerciseIllustrationProps) {
  const entry = illustrationForExercise(exercise);
  const patternLabel = exercise.movementPatterns[0]
    ? humanisePattern(exercise.movementPatterns[0])
    : 'MOVEMENT';

  return (
    <View style={styles.container}>
      {/* Framed visual — illustration PNG or brand icon fallback */}
      <View style={styles.frame}>
        {entry.source != null ? (
          <Image source={entry.source} resizeMode="contain" style={styles.illustration} />
        ) : (
          <AppIcon name={fallbackIconName(exercise)} size={54} active />
        )}
      </View>

      {/* Pattern label + form cue */}
      <View style={styles.cueBlock}>
        <Text style={styles.patternLabel}>{patternLabel}</Text>
        <Text style={styles.formCue}>{entry.formCue}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  frame: {
    width: 96,
    height: 96,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1.5,
    borderColor: Colors.accent.primary,
    borderRadius: 8,
    // Subtle teal glow — matches kettlebellIconFrame in AppIcons.tsx
    shadowColor: Colors.accent.teal,
    shadowOpacity: IconTheme.glow.subtle.shadowOpacity,
    shadowRadius: IconTheme.glow.subtle.shadowRadius,
    shadowOffset: IconTheme.glow.subtle.shadowOffset,
    elevation: IconTheme.glow.subtle.elevation,
  },
  illustration: {
    width: 80,
    height: 80,
  },
  cueBlock: {
    flex: 1,
    paddingTop: 2,
  },
  patternLabel: {
    fontFamily: 'Anton_400Regular',
    fontSize: 11,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  formCue: {
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
});
