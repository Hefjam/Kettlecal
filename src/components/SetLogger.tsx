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
import { Exercise, Set, ExerciseTarget } from '../types';
import { MinusIcon, PlusIcon } from './icons/StepperIcons';
import { AppIcon } from './icons/AppIcons';

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
  const [reps, setReps] = useState(initReps ?? 0);
  const [weight, setWeight] = useState(String(initWeight ?? ''));
  const [duration, setDuration] = useState(String(initDuration ?? ''));

  const isReps = exercise.type === 'reps' || exercise.type === 'emom';
  const isTime = exercise.type === 'time';
  const hasWeight = exercise.category === 'kettlebell';
  const prescribedSetCount = target?.sets;
  const targetParts = [
    target?.targetReps != null ? `${target.targetReps} reps` : null,
    target?.targetSeconds != null ? `${target.targetSeconds}s` : null,
    target?.weightKg != null ? `${target.weightKg}kg` : null,
  ].filter(Boolean);
  const setLabel =
    prescribedSetCount != null && setNumber <= prescribedSetCount
      ? `Set ${setNumber} of ${prescribedSetCount}`
      : `Extra set ${prescribedSetCount != null ? setNumber - prescribedSetCount : setNumber}`;

  const handleLog = () => {
    const set: Omit<Set, 'completedAt'> = {};
    if (isReps && reps > 0) set.reps = reps;
    if (hasWeight && weight) set.weight = Number(weight);
    if (isTime && duration) set.duration = Number(duration);
    onLog(set);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const adjustReps = (delta: number) => {
    setReps((current) => Math.max(0, current + delta));
    Haptics.selectionAsync();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.setLabel}>{setLabel}</Text>
        {targetParts.length > 0 && (
          <Text style={styles.targetHint}>Target: {targetParts.join(' · ')}</Text>
        )}
        {previousSet && (
          <Text style={styles.previous}>
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
              <View style={styles.repStepper}>
                <TouchableOpacity
                  style={[styles.repStepBtn, reps === 0 && styles.repStepBtnDisabled]}
                  onPress={() => adjustReps(-1)}
                  disabled={reps === 0}
                  hitSlop={STEPPER_HITSLOP}
                  activeOpacity={0.75}
                >
                  <MinusIcon color={reps === 0 ? Colors.text.muted : Colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.repValue}>{reps}</Text>
                <TouchableOpacity
                  style={styles.repStepBtn}
                  onPress={() => adjustReps(1)}
                  hitSlop={STEPPER_HITSLOP}
                  activeOpacity={0.75}
                >
                  <PlusIcon color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
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
            <AppIcon name="action.add" size={24} active />
            <Text style={styles.logBtnText}>LOG SET</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  setLabel: {
    fontFamily: 'Anton_400Regular',
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  previous: {
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
    marginBottom: 12,
    color: Colors.accent.teal,
  },
  targetHint: {
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
    marginBottom: 8,
    color: Colors.text.secondary,
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
    fontFamily: 'Anton_400Regular',
    color: Colors.text.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: 'VT323_400Regular',
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 8,
    color: Colors.accent.acid,
    fontSize: 28,
    textAlign: 'center',
  },
  repStepper: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  repStepBtn: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
  },
  repStepBtnDisabled: {
    opacity: 0.35,
  },
  repValue: {
    flex: 1,
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    fontSize: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  logBtn: {
    height: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.accent.primary,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logBtnText: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.text.inverse,
    fontSize: 14,
  },
});

const STEPPER_HITSLOP = { top: 8, bottom: 8, left: 8, right: 8 };
