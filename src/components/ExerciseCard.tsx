import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Exercise, ExerciseLog, Set } from '../types';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';

interface ExerciseCardProps {
  exercise: Exercise;
  log: ExerciseLog;
  isRestActive: boolean;
  restSeconds: number;
  onAddSet: (set: Omit<Set, 'completedAt'>) => void;
  onRestComplete: () => void;
  onRestSkip: () => void;
  onEmomPress: () => void;
}

export function ExerciseCard({
  exercise,
  log,
  isRestActive,
  restSeconds,
  onAddSet,
  onRestComplete,
  onRestSkip,
  onEmomPress,
}: ExerciseCardProps) {
  const completedSets = log.sets.length;
  const lastSet = log.sets[log.sets.length - 1];

  return (
    <Animated.View
      entering={FadeInRight.duration(250)}
      exiting={FadeOutLeft.duration(200)}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={Typography.h1}>{exercise.name}</Text>
          <View style={styles.tags}>
            <Tag label={exercise.category} />
            {exercise.muscleGroups.slice(0, 2).map((m) => (
              <Tag key={m} label={m} dim />
            ))}
          </View>
        </View>
        {exercise.type === 'emom' && (
          <TouchableOpacity style={styles.emomBtn} onPress={onEmomPress}>
            <Text style={styles.emomBtnText}>🔔 EMOM</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Set history */}
      {log.sets.length > 0 && (
        <View style={styles.history}>
          {log.sets.map((s, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={[Typography.caption, { color: Colors.text.muted }]}>Set {i + 1}</Text>
              <Text style={[Typography.mono, { fontSize: 14 }]}>
                {s.reps != null ? `${s.reps} reps` : ''}
                {s.weight != null ? ` · ${s.weight}kg` : ''}
                {s.duration != null ? ` · ${s.duration}s` : ''}
              </Text>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          ))}
        </View>
      )}

      {/* Rest timer or set logger */}
      {isRestActive ? (
        <RestTimer
          seconds={restSeconds}
          onComplete={onRestComplete}
          onSkip={onRestSkip}
        />
      ) : (
        <SetLogger
          exercise={exercise}
          setNumber={completedSets + 1}
          previousSet={lastSet}
          onLog={onAddSet}
        />
      )}
    </Animated.View>
  );
}

function Tag({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <View style={[styles.tag, dim && styles.tagDim]}>
      <Text style={[styles.tagText, dim && styles.tagTextDim]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: { flex: 1 },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    backgroundColor: Colors.accent.glow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagDim: {
    backgroundColor: Colors.bg.elevated,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent.primary,
    textTransform: 'capitalize',
  },
  tagTextDim: {
    color: Colors.text.muted,
  },
  history: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginBottom: 12,
    gap: 6,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkmark: {
    color: Colors.status.success,
    fontSize: 14,
    fontWeight: '700',
  },
  emomBtn: {
    backgroundColor: Colors.accent.glow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent.dim,
  },
  emomBtnText: {
    color: Colors.accent.primary,
    fontWeight: '700',
    fontSize: 12,
  },
});
