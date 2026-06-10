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
import { Exercise, Set, ExerciseTarget } from '../types';

interface SetLoggerProps {
  exercise: Exercise;
  setNumber: number;
  previousSet?: Set;
  target?: ExerciseTarget;
  onLog: (set: Omit<Set, 'completedAt'>) => void;
}

export function SetLogger({ exercise, setNumber, previousSet, target, onLog }: SetLoggerProps) {
  // Set 1 seeds from the coach's target (the prescription); sets 2+ seed from the
  // set you just logged. The parent re-keys this component by setNumber so these
  // useState initializers re-run each set instead of sticking to set 1's values.
  const useTarget = setNumber === 1 && target != null;
  const initReps = useTarget ? target!.targetReps : previousSet?.reps;
  const initWeight = useTarget ? target!.weightKg : previousSet?.weight;
  const initDuration = useTarget ? target!.targetSeconds : previousSet?.duration;
  const [reps, setReps] = useState(String(initReps ?? ''));
  const [weight, setWeight] = useState(String(initWeight ?? ''));
  const [duration, setDuration] = useState(String(initDuration ?? ''));

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
              <Text style={styles.inputLabel}>Reps</Text>
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
              <Text style={styles.inputLabel}>kg</Text>
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
              <Text style={styles.inputLabel}>Seconds</Text>
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
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  setLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.accent.primary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  previous: {
    marginBottom: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    color: Colors.text.secondary,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 8,
    color: Colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  logBtn: {
    width: 50,
    height: 50,
    backgroundColor: Colors.accent.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logBtnText: {
    color: Colors.text.primary,
    fontSize: 24,
    fontWeight: '900',
  },
});
