import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Exercise, ExerciseFeedback, ExerciseLog, ExerciseTarget, Set } from '../types';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';
import { SynthCard } from './SynthCard';
import { AppIcon } from './icons/AppIcons';
import { MinusIcon, PlusIcon } from './icons/StepperIcons';
import { ExerciseIllustration } from './ExerciseIllustration';

interface ExerciseCardProps {
  exercise: Exercise;
  log: ExerciseLog;
  target?: ExerciseTarget;
  isCurrentExercise: boolean;
  isRestActive: boolean;
  restSeconds: number;
  restEndsAt: number | null;
  canLogExtraSet: boolean;
  onAddSet: (set: Omit<Set, 'completedAt'>) => void;
  onLogExtraSet: () => void;
  onFeedbackChange: (feedback: ExerciseFeedback) => void;
  onRestComplete: () => void;
  onRestSkip: () => void;
  onEmomPress: () => void;
  /** Swap this upcoming exercise for an alternative (mid-session, before first set). */
  onSwapMid?: () => void;
  /** Escalate difficulty (ladder promotion or heavier KB) before first set. */
  onEscalate?: () => void;
  /** Swap the CURRENT exercise before any sets are logged. */
  onSwapCurrent?: (reason?: string) => void;
  /** Edit a logged set (patch of changed fields). */
  onEditSet?: (setIndex: number, patch: { reps?: number; weight?: number; duration?: number }) => void;
  /** Remove a logged set (confirmation handled by caller). */
  onRemoveSet?: (setIndex: number) => void;
}

export function ExerciseCard({
  exercise,
  log,
  target,
  isCurrentExercise,
  isRestActive,
  restSeconds,
  restEndsAt,
  canLogExtraSet,
  onAddSet,
  onLogExtraSet,
  onFeedbackChange,
  onRestComplete,
  onRestSkip,
  onEmomPress,
  onSwapMid,
  onEscalate,
  onSwapCurrent,
  onEditSet,
  onRemoveSet,
}: ExerciseCardProps) {
  const completedSets = log.sets.length;
  const lastSet = log.sets[log.sets.length - 1];

  // Local state for the current-exercise swap UI
  const [swapReasonVisible, setSwapReasonVisible] = useState(false);
  const [swapReason, setSwapReason] = useState('');

  // Local state for inline set editing
  // editingIndex: which set row is in edit mode (-1 = none)
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editReps, setEditReps] = useState(0);
  const [editWeight, setEditWeight] = useState('');
  const [editDuration, setEditDuration] = useState('');

  // Derived from exercise type — same logic as SetLogger
  const isReps = exercise.type === 'reps' || exercise.type === 'emom';
  const isTime = exercise.type === 'time';
  const hasWeight = exercise.category === 'kettlebell';

  // --- Prescription reminder (#5) ---
  const prescriptionLine = (() => {
    if (!target) return null;
    const parts: string[] = [];
    const reps = target.targetReps != null ? `${target.sets}×${target.targetReps}` : null;
    const secs = target.targetSeconds != null ? `${target.sets}×${target.targetSeconds}s` : null;
    const spec = reps ?? secs ?? `${target.sets} sets`;
    parts.push(spec);
    if (target.weightKg != null) parts.push(`${target.weightKg}kg`);
    const specStr = parts.join(' · ');
    const setsLeft = Math.max(0, target.sets - log.sets.length);
    const status = setsLeft === 0 ? 'TARGET MET' : `${setsLeft} LEFT`;
    return `AIM ${specStr} — ${status}`;
  })();

  // --- Swap current exercise handlers (#2) ---
  const handleSwapCurrentConfirm = () => {
    if (onSwapCurrent) {
      onSwapCurrent(swapReason.trim() || undefined);
      setSwapReason('');
      setSwapReasonVisible(false);
    }
  };

  // --- Edit set helpers (#4) ---
  const openEdit = (i: number) => {
    const s = log.sets[i];
    setEditReps(s.reps ?? 0);
    setEditWeight(s.weight != null ? String(s.weight) : '');
    setEditDuration(s.duration != null ? String(s.duration) : '');
    setEditingIndex(i);
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
  };

  const commitEdit = (i: number) => {
    if (!onEditSet) return;
    const patch: { reps?: number; weight?: number; duration?: number } = {};
    if (isReps && editReps > 0) patch.reps = editReps;
    if (hasWeight && editWeight) patch.weight = Number(editWeight);
    if (isTime && editDuration) patch.duration = Number(editDuration);
    onEditSet(i, patch);
    setEditingIndex(-1);
  };

  const adjustEditReps = (delta: number) => {
    setEditReps((cur) => Math.max(0, cur + delta));
  };

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

        {/* Exercise illustration + form cue */}
        <ExerciseIllustration exercise={exercise} />

        {/* Coach target — the visible "beat last / leveled up" prompt */}
        {target && <Text style={styles.targetReason}>🎯 {target.reason}</Text>}

        {/* Persistent prescription reminder (#5) */}
        {prescriptionLine && (
          <Text style={styles.prescriptionLine}>{prescriptionLine}</Text>
        )}

        {/* Set history */}
        {log.sets.length > 0 && (
          <View style={styles.history}>
            {log.sets.map((s, i) => {
              const isEditing = editingIndex === i;
              return (
                <View key={i}>
                  {isEditing ? (
                    /* Inline edit row */
                    <View style={styles.editRow}>
                      <Text style={styles.setNumLabel}>Set {i + 1}</Text>
                      <View style={styles.editInputs}>
                        {isReps && (
                          <View style={styles.editRepStepper}>
                            <TouchableOpacity
                              style={[styles.editStepBtn, editReps === 0 && styles.editStepBtnDisabled]}
                              onPress={() => adjustEditReps(-1)}
                              disabled={editReps === 0}
                              hitSlop={STEPPER_HITSLOP}
                            >
                              <MinusIcon color={editReps === 0 ? Colors.text.muted : Colors.text.primary} />
                            </TouchableOpacity>
                            <Text style={styles.editRepValue}>{editReps}</Text>
                            <TouchableOpacity
                              style={styles.editStepBtn}
                              onPress={() => adjustEditReps(1)}
                              hitSlop={STEPPER_HITSLOP}
                            >
                              <PlusIcon color={Colors.text.primary} />
                            </TouchableOpacity>
                          </View>
                        )}
                        {hasWeight && (
                          <TextInput
                            style={styles.editInput}
                            value={editWeight}
                            onChangeText={setEditWeight}
                            keyboardType="decimal-pad"
                            placeholder="kg"
                            placeholderTextColor={Colors.text.muted}
                            selectTextOnFocus
                          />
                        )}
                        {isTime && (
                          <TextInput
                            style={styles.editInput}
                            value={editDuration}
                            onChangeText={setEditDuration}
                            keyboardType="number-pad"
                            placeholder="s"
                            placeholderTextColor={Colors.text.muted}
                            selectTextOnFocus
                          />
                        )}
                      </View>
                      <View style={styles.editActions}>
                        <TouchableOpacity style={styles.editConfirmBtn} onPress={() => commitEdit(i)} hitSlop={STEPPER_HITSLOP}>
                          <Text style={styles.editConfirmBtnText}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editCancelBtn} onPress={cancelEdit} hitSlop={STEPPER_HITSLOP}>
                          <Text style={styles.editCancelBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    /* Normal history row with edit/delete affordances */
                    <View style={styles.historyRow}>
                      <Text style={styles.setNumLabel}>Set {i + 1}</Text>
                      <Text style={styles.setVal}>
                        {s.reps != null ? `${s.reps} reps` : ''}
                        {s.weight != null ? ` · ${s.weight}kg` : ''}
                        {s.duration != null ? ` · ${s.duration}s` : ''}
                      </Text>
                      <View style={styles.historyRowActions}>
                        {onEditSet && (
                          <TouchableOpacity
                            style={styles.setActionBtn}
                            onPress={() => openEdit(i)}
                            hitSlop={STEPPER_HITSLOP}
                          >
                            <Text style={styles.setEditBtnText}>✎</Text>
                          </TouchableOpacity>
                        )}
                        {onRemoveSet && (
                          <TouchableOpacity
                            style={styles.setActionBtn}
                            onPress={() => onRemoveSet(i)}
                            hitSlop={STEPPER_HITSLOP}
                          >
                            <Text style={styles.setDeleteBtnText}>×</Text>
                          </TouchableOpacity>
                        )}
                        {!onEditSet && !onRemoveSet && (
                          <AppIcon name="action.complete" size={22} active />
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Rest timer or set logger */}
        {!isCurrentExercise ? (
          <View style={styles.previewNotice}>
            <Text style={styles.previewText}>Preview only. Logging remains on your current exercise.</Text>
            <View style={styles.previewActions}>
              {canLogExtraSet && (
                <TouchableOpacity style={styles.extraSetBtn} onPress={onLogExtraSet} activeOpacity={0.8}>
                  <Text style={styles.extraSetBtnText}>Log Extra Set</Text>
                </TouchableOpacity>
              )}
              {onSwapMid && (
                <TouchableOpacity style={styles.swapMidBtn} onPress={onSwapMid} activeOpacity={0.8}>
                  <AppIcon name="action.swapExercise" size={16} active />
                  <Text style={styles.swapMidBtnText}>Swap</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : isRestActive ? (
          <RestTimer
            seconds={restSeconds}
            endsAt={restEndsAt}
            onComplete={onRestComplete}
            onSkip={onRestSkip}
          />
        ) : (
          <>
            {/* Swap current exercise (#2) — only before first set */}
            {onSwapCurrent && completedSets === 0 && (
              <View style={styles.swapCurrentBlock}>
                {!swapReasonVisible ? (
                  <TouchableOpacity
                    style={styles.swapMidBtn}
                    onPress={() => setSwapReasonVisible(true)}
                    activeOpacity={0.8}
                  >
                    <AppIcon name="action.swapExercise" size={16} active />
                    <Text style={styles.swapMidBtnText}>Swap</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.swapReasonContainer}>
                    <TextInput
                      style={styles.swapReasonInput}
                      value={swapReason}
                      onChangeText={setSwapReason}
                      placeholder="Reason (optional) — e.g. shoulder twinge"
                      placeholderTextColor={Colors.text.muted}
                      autoFocus
                    />
                    <View style={styles.swapReasonActions}>
                      <TouchableOpacity
                        style={styles.swapConfirmBtn}
                        onPress={handleSwapCurrentConfirm}
                        activeOpacity={0.8}
                      >
                        <AppIcon name="action.swapExercise" size={16} active />
                        <Text style={styles.swapMidBtnText}>Confirm Swap</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.swapCancelBtn}
                        onPress={() => { setSwapReasonVisible(false); setSwapReason(''); }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.swapCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
            {onEscalate && completedSets === 0 && (
              <TouchableOpacity style={styles.escalateBtn} onPress={onEscalate} activeOpacity={0.8}>
                <Text style={styles.escalateBtnText}>↑ Make it Harder</Text>
              </TouchableOpacity>
            )}
            <SetLogger
              key={completedSets + 1}
              exercise={exercise}
              setNumber={completedSets + 1}
              previousSet={lastSet}
              target={target}
              onLog={onAddSet}
            />
          </>
        )}

        {/* End-of-exercise judgment — optional, placed after the sets so it's a
            "how did that feel" step, not something tapped before lifting. */}
        {isCurrentExercise && (
          <FeedbackControls feedback={log.feedback} onChange={onFeedbackChange} />
        )}
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
          help="0-10 discomfort in the involved area. Pain 4+ can downrank this exercise when auto-adjust is enabled; 6+ can avoid the pattern."
          value={feedback?.pain}
          fallback={0}
          min={0}
          max={10}
          onChange={(pain) => update({ pain })}
        />
        <Stepper
          label="RPE"
          help="Rating of Perceived Exertion, 1-10. Use it for how hard the set felt, or roughly how few reps were left."
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
  help,
  value,
  fallback,
  min,
  max,
  onChange,
}: {
  label: string;
  help: string;
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
      <Text style={styles.stepperHelp}>{help}</Text>
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
    marginBottom: 6,
  },
  prescriptionLine: {
    fontFamily: 'Anton_400Regular',
    fontSize: 14,
    color: Colors.accent.acid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
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
  previewNotice: {
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    marginVertical: 8,
  },
  previewText: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.secondary,
    fontSize: 18,
    lineHeight: 22,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  extraSetBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent.primary,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  extraSetBtnText: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.text.inverse,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  swapMidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: Colors.accent.teal,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  swapMidBtnText: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.accent.teal,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  swapCurrentBlock: {
    marginBottom: 10,
  },
  swapReasonContainer: {
    borderWidth: 1.5,
    borderColor: Colors.accent.teal,
    borderRadius: 4,
    padding: 12,
    gap: 10,
  },
  swapReasonInput: {
    fontFamily: 'VT323_400Regular',
    fontSize: 18,
    color: Colors.text.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 6,
  },
  swapReasonActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  swapConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: Colors.accent.teal,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  swapCancelBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  swapCancelBtnText: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.text.muted,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  escalateBtn: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: Colors.accent.acid,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  escalateBtnText: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.accent.acid,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  stepperHelp: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.secondary,
    fontSize: 14,
    lineHeight: 17,
    marginTop: 6,
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
  historyRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setNumLabel: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.muted,
    fontSize: 16,
    width: 44,
  },
  setVal: {
    fontFamily: 'VT323_400Regular',
    fontSize: 20,
    color: Colors.accent.acid,
    flex: 1,
  },
  setActionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  setEditBtnText: {
    fontFamily: 'VT323_400Regular',
    fontSize: 18,
    color: Colors.accent.teal,
  },
  setDeleteBtnText: {
    fontFamily: 'VT323_400Regular',
    fontSize: 22,
    color: Colors.accent.primary,
  },
  // Inline edit row
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  editInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  editRepStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    height: 38,
    overflow: 'hidden',
    flex: 1,
  },
  editStepBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
  },
  editStepBtnDisabled: {
    opacity: 0.35,
  },
  editRepValue: {
    flex: 1,
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    fontSize: 22,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  editInput: {
    fontFamily: 'VT323_400Regular',
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    height: 38,
    paddingHorizontal: 8,
    color: Colors.accent.acid,
    fontSize: 22,
    textAlign: 'center',
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: 4,
  },
  editConfirmBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.teal,
    borderRadius: 4,
  },
  editConfirmBtnText: {
    fontFamily: 'VT323_400Regular',
    fontSize: 20,
    color: Colors.text.inverse,
  },
  editCancelBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
  },
  editCancelBtnText: {
    fontFamily: 'VT323_400Regular',
    fontSize: 20,
    color: Colors.text.muted,
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
