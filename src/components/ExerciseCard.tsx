import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Exercise, ExerciseFeedback, ExerciseLog, ExerciseTarget, Set } from '../types';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';

interface ExerciseCardProps {
  exercise: Exercise;
  log: ExerciseLog;
  target?: ExerciseTarget;
  isRestActive: boolean;
  restSeconds: number;
  onAddSet: (set: Omit<Set, 'completedAt'>) => void;
  onFeedbackChange: (feedback: ExerciseFeedback) => void;
  onRestComplete: () => void;
  onRestSkip: () => void;
  onEmomPress: () => void;
}

export function ExerciseCard({
  exercise,
  log,
  target,
  isRestActive,
  restSeconds,
  onAddSet,
  onFeedbackChange,
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

      {/* Coach target — the visible "beat last / leveled up" prompt */}
      {target && <Text style={[Typography.caption, styles.targetReason]}>🎯 {target.reason}</Text>}

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
          key={completedSets + 1}
          exercise={exercise}
          setNumber={completedSets + 1}
          previousSet={lastSet}
          target={target}
          onLog={onAddSet}
        />
      )}

      {/* End-of-exercise judgment — optional, placed after the sets so it's a
          "how did that feel" step, not something tapped before lifting. */}
      <FeedbackControls feedback={log.feedback} onChange={onFeedbackChange} />
    </Animated.View>
  );
}

function FeedbackControls({
  feedback,
  onChange,
}: {
  feedback?: ExerciseFeedback;
  onChange: (feedback: ExerciseFeedback) => void;
}) {
  const update = (patch: ExerciseFeedback) => onChange({ ...(feedback ?? {}), ...patch });
  return (
    <View style={styles.feedbackBlock}>
      <Text style={styles.feedbackPrompt}>How did that feel? (optional)</Text>
      <View style={styles.feedback}>
        <Stepper
          label="Pain"
          value={feedback?.pain}
          fallback={0}
          min={0}
          max={10}
          onChange={(pain) => update({ pain })}
        />
        <Stepper
          label="RPE"
          value={feedback?.rpe}
          fallback={7}
          min={1}
          max={10}
          onChange={(rpe) => update({ rpe })}
        />
      </View>
      <Text style={styles.feedbackNote}>
        Self-tracking, not medical advice. Pain that persists — see a clinician.
      </Text>
    </View>
  );
}

const STEPPER_HITSLOP = { top: 10, bottom: 10, left: 10, right: 10 };

function Stepper({
  label,
  value,
  fallback,
  min,
  max,
  onChange,
}: {
  label: string;
  value?: number;
  fallback: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  // Unset is meaningful: a missing value is "not rated", which must stay
  // distinct from a deliberate 0. The first tap commits the fallback (no ±1
  // jump); subsequent taps step from the committed value.
  const isSet = value != null;
  const current = value ?? fallback;
  const dec = () => onChange(isSet ? Math.max(min, current - 1) : fallback);
  const inc = () => onChange(isSet ? Math.min(max, current + 1) : fallback);
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity style={styles.stepperBtn} onPress={dec} hitSlop={STEPPER_HITSLOP}>
          <Text style={styles.stepperBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={[styles.stepperValue, !isSet && styles.stepperValueUnset]}>
          {isSet ? current : '–'}
        </Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={inc} hitSlop={STEPPER_HITSLOP}>
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  targetReason: {
    color: Colors.accent.primary,
    marginBottom: 12,
    fontWeight: '600',
  },
  feedbackBlock: {
    marginTop: 12,
  },
  feedbackPrompt: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedback: {
    flexDirection: 'row',
    gap: 10,
  },
  feedbackNote: {
    color: Colors.text.secondary,
    fontSize: 11,
    marginTop: 8,
  },
  stepper: {
    flex: 1,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 10,
    padding: 10,
  },
  stepperLabel: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  stepperValue: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  stepperValueUnset: {
    color: Colors.text.secondary,
    fontWeight: '600',
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
