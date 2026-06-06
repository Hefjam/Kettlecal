import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Exercise, Set } from '../types';

interface SetLoggerProps {
  exercise: Exercise;
  setNumber: number;
  previousSet?: Set;
  onLog: (set: Omit<Set, 'completedAt'>) => void;
}

export function SetLogger({ exercise, setNumber, previousSet, onLog }: SetLoggerProps) {
  const [reps, setReps] = useState(String(previousSet?.reps ?? ''));
  const [weight, setWeight] = useState(String(previousSet?.weight ?? ''));
  const [duration, setDuration] = useState(String(previousSet?.duration ?? ''));

  const isReps = exercise.type === 'reps' || exercise.type === 'emom';
  const isTime = exercise.type === 'time';
  const hasWeight = exercise.category === 'kettlebell';

  const handleLog = () => {
    const set: Omit<Set, 'completedAt'> = {};
    if (isReps && reps) set.reps = Number(reps);
    if (hasWeight && weight) set.weight = Number(weight);
    if (isTime && duration) set.duration = Number(duration);
    onLog(set);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={[Typography.label, styles.setLabel]}>Set {setNumber}</Text>
        {previousSet && (
          <Text style={[Typography.caption, styles.previous]}>
            prev:{' '}
            {previousSet.reps != null ? `${previousSet.reps} reps` : ''}
            {previousSet.weight != null ? ` · ${previousSet.weight}kg` : ''}
            {previousSet.duration != null ? ` · ${previousSet.duration}s` : ''}
          </Text>
        )}

        <View style={styles.inputRow}>
          {isReps && (
            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>Reps</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                selectTextOnFocus
              />
            </View>
          )}
          {hasWeight && (
            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>kg</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                selectTextOnFocus
              />
            </View>
          )}
          {isTime && (
            <View style={styles.inputGroup}>
              <Text style={Typography.caption}>Seconds</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                selectTextOnFocus
              />
            </View>
          )}

          <TouchableOpacity style={styles.logBtn} onPress={handleLog}>
            <Text style={styles.logBtnText}>✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
  },
  setLabel: {
    marginBottom: 2,
  },
  previous: {
    marginBottom: 10,
    color: Colors.text.muted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 4,
  },
  input: {
    backgroundColor: Colors.bg.elevated,
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  logBtn: {
    width: 52,
    height: 52,
    backgroundColor: Colors.accent.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: {
    color: Colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
  },
});
