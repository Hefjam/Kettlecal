import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Exercise, ExerciseFeedback, ExerciseLog, ExerciseTarget, Set } from '../types';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';
import { SynthCard } from './SynthCard';

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
    >
      <SynthCard style={{ marginBottom: 12 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
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
        {target && <Text style={styles.targetReason}>🎯 {target.reason}</Text>}

        {/* Set history */}
        {log.sets.length > 0 && (
          <View style={styles.history}>
            {log.sets.map((s, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.setNumLabel}>Set {i + 1}</Text>
                <Text style={styles.setVal}>
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
      </SynthCard>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: { flex: 1 },
  exerciseName: {
    fontFamily: 'Anton_400Regular',
    fontSize: 28,
    textTransform: 'uppercase',
    color: Colors.text.primary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,46,136,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent.primary,
  },
  tagDim: {
    backgroundColor: Colors.bg.elevated,
    borderColor: Colors.border,
  },
  tagText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 11,
    color: Colors.accent.acid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagTextDim: {
    color: Colors.text.secondary,
  },
  targetReason: {
    fontFamily: 'VT323_400Regular',
    fontSize: 18,
    color: Colors.accent.teal,
    marginBottom: 16,
  },
  feedbackBlock: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
  },
  feedbackPrompt: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.secondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  feedback: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackNote: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.muted,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 18,
  },
  stepper: {
    flex: 1,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepperBtn: {
    width: 44,          // Satisfies the 44x44 minimum touch target size
    height: 44,         // Satisfies the 44x44 minimum touch target size
    borderRadius: 12,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperBtnText: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.primary,
    fontSize: 28,
  },
  stepperValue: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },
  stepperValueUnset: {
    color: Colors.text.muted,
  },
  history: {
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
    paddingTop: 14,
    marginBottom: 14,
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setNumLabel: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.muted,
    fontSize: 16,
  },
  setVal: {
    fontFamily: 'VT323_400Regular',
    fontSize: 20,
    color: Colors.accent.acid,
  },
  checkmark: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.teal,
    fontSize: 22,
  },
  emomBtn: {
    backgroundColor: 'rgba(25,224,200,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.accent.teal,
  },
  emomBtnText: {
    fontFamily: 'Anton_400Regular',
    color: Colors.accent.teal,
    textTransform: 'uppercase',
    fontSize: 12,
  },
});
