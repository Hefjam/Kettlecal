import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { EXERCISES } from '../../src/data/exercises';
import { useActiveSession } from '../../src/stores/useActiveSession';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { useEquipment } from '../../src/stores/useEquipment';
import { useCoachProfile } from '../../src/stores/useCoachProfile';
import { ExerciseCard } from '../../src/components/ExerciseCard';
import { EmomTimer } from '../../src/components/EmomTimer';
import { AppIcon } from '../../src/components/icons/AppIcons';
import { nextSwapTarget } from '../../src/engine/generateWorkout';
import { buildTarget } from '../../src/engine/progression';
import { findLastLogFor } from '../../src/engine/history';
import { nextRung } from '../../src/data/ladders';
import { ownedKbWeightsFor } from '../../src/data/availability';
import { dayKey } from '../../src/utils/dayKey';
import { PlannedWorkout, Set } from '../../src/types';
import {
  requestRestNotificationPermission,
  scheduleRestEnd,
  cancelRestEnd,
} from '../../src/services/restNotification';

export default function WorkoutScreen() {
  const {
    session,
    currentExerciseIndex,
    viewedExerciseIndex,
    isRestTimerActive,
    restSeconds,
    restEndsAt,
    targets,
    planEmphasis,
    nextExercise,
    prevExercise,
    addSet,
    setExerciseFeedback,
    setCurrentExercise,
    swapExercise,
    removeSet,
    editSet,
    stopRestTimer,
    completeWorkout,
    abandonWorkout,
  } = useActiveSession();

  const { addSession } = useWorkoutHistory();
  const equipment = useEquipment((s) => s.equipment);
  const coachProfile = useCoachProfile((s) => s.profile);
  const sessions = useWorkoutHistory((s) => s.sessions);

  const [emomVisible, setEmomVisible] = useState(false);
  const leavingRef = useRef(false);
  const hasPromptedRef = useRef(false);

  // Request notification permission once on mount
  useEffect(() => {
    requestRestNotificationPermission();
  }, []);

  // Schedule / cancel rest-end notification whenever the deadline changes
  useEffect(() => {
    if (restEndsAt && isRestTimerActive) {
      scheduleRestEnd(restEndsAt);
    } else {
      cancelRestEnd();
    }
    return () => { cancelRestEnd(); };
  }, [restEndsAt, isRestTimerActive]);

  useEffect(() => {
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;
    const staleSession = useActiveSession.getState().session;
    if (!staleSession || staleSession.isCompleted) return;
    const ageMs = Date.now() - new Date(staleSession.startedAt).getTime();
    if (ageMs < 10_000) return;
    if (Platform.OS === 'web') {
      const resume = window.confirm('Resume your unfinished workout?');
      if (!resume) {
        leavingRef.current = true;
        abandonWorkout();
        router.replace('/');
      }
    } else {
      Alert.alert(
        'Resume workout?',
        'You have an unfinished workout.',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              leavingRef.current = true;
              abandonWorkout();
              router.replace('/');
            },
          },
          { text: 'Continue', style: 'default' },
        ]
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(session.startedAt).getTime();
      setSecondsElapsed(Math.floor(elapsed / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) {
    if (!leavingRef.current) router.replace('/');
    return null;
  }

  const currentLog = session.exerciseLogs[currentExerciseIndex];
  const viewedLog = session.exerciseLogs[viewedExerciseIndex] ?? currentLog;
  const currentExercise = EXERCISES.find((e) => e.id === currentLog?.exerciseId);
  const viewedExercise = EXERCISES.find((e) => e.id === viewedLog?.exerciseId);
  const totalExercises = session.exerciseLogs.length;
  const isViewingCurrent = viewedExerciseIndex === currentExerciseIndex;
  const canLogExtraSet = viewedExerciseIndex < currentExerciseIndex;

  if (!currentExercise || !currentLog || !viewedExercise || !viewedLog) return null;

  // --- Escalation target (ladder promotion or heavier KB, before first set) ---
  const escalateTarget = (() => {
    if (!isViewingCurrent || currentLog.sets.length > 0) return null;

    // 1. Try ladder promotion
    const nextEx = nextRung(currentExercise.id, EXERCISES, equipment);
    if (nextEx) {
      return buildTarget(
        nextEx,
        findLastLogFor(sessions, nextEx.id),
        equipment,
        EXERCISES,
        [],
        coachProfile
      );
    }

    // 2. Try heavier KB (same exercise, bump weight)
    if (currentExercise.category === 'kettlebell') {
      const weights = ownedKbWeightsFor(currentExercise, equipment);
      const currentTarget = targets[currentExercise.id];
      const currentWeight = currentTarget?.weightKg;
      if (currentWeight != null) {
        const heavier = weights.find((w) => w > currentWeight);
        if (heavier != null) {
          return { ...currentTarget, weightKg: heavier, reason: `Escalated → ${heavier}kg` };
        }
      }
    }

    return null;
  })();

  // --- Handlers ---

  const handleAddSet = (set: Omit<Set, 'completedAt'>) => {
    addSet(currentExercise.id, set);
  };

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const finish = () => {
      leavingRef.current = true;
      const completed = completeWorkout();
      if (completed) addSession(completed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/workout/complete');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Finish workout?\n\nYour session will be saved.')) finish();
      return;
    }
    Alert.alert('Finish workout?', 'Your session will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Finish', style: 'default', onPress: finish },
    ]);
  };

  const handleAbandon = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const abandon = () => {
      leavingRef.current = true;
      abandonWorkout();
      router.replace('/');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Abandon workout?\n\nProgress will be lost.')) abandon();
      return;
    }
    Alert.alert('Abandon workout?', 'Progress will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: abandon },
    ]);
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    prevExercise();
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextExercise();
  };

  // Mid-workout swap: replaces the viewed upcoming exercise with an alternative
  const canSwapMid =
    !isViewingCurrent &&
    viewedExerciseIndex > currentExerciseIndex &&
    viewedLog.sets.length === 0;

  const handleSwapMid = canSwapMid
    ? () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const syntheticPlan: PlannedWorkout = {
          date: dayKey(),
          emphasis: planEmphasis ?? 'strength',
          targets: session.exerciseLogs.map(
            (log) =>
              targets[log.exerciseId] ?? { exerciseId: log.exerciseId, sets: 0, reason: '' }
          ),
        };
        const newTarget = nextSwapTarget(
          syntheticPlan,
          viewedExerciseIndex,
          sessions,
          equipment,
          coachProfile
        );
        if (newTarget.exerciseId !== viewedLog.exerciseId) {
          swapExercise(viewedExerciseIndex, newTarget);
        }
      }
    : undefined;

  const handleEscalate = escalateTarget
    ? () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        swapExercise(currentExerciseIndex, escalateTarget);
      }
    : undefined;

  // Swap the current exercise before any sets are logged (#2)
  const canSwapCurrent =
    isViewingCurrent && currentLog.sets.length === 0;

  const handleSwapCurrent = canSwapCurrent
    ? (reason?: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const syntheticPlan: PlannedWorkout = {
          date: dayKey(),
          emphasis: planEmphasis ?? 'strength',
          targets: session.exerciseLogs.map(
            (log) =>
              targets[log.exerciseId] ?? { exerciseId: log.exerciseId, sets: 0, reason: '' }
          ),
        };
        const newTarget = nextSwapTarget(
          syntheticPlan,
          currentExerciseIndex,
          sessions,
          equipment,
          coachProfile
        );
        if (newTarget.exerciseId !== currentLog.exerciseId) {
          swapExercise(currentExerciseIndex, newTarget, reason);
        }
      }
    : undefined;

  // Remove a logged set with confirmation (#4)
  const handleRemoveSet = (setIndex: number) => {
    const doRemove = () => removeSet(viewedExercise!.id, setIndex);
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this set?')) doRemove();
      return;
    }
    Alert.alert('Remove set?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doRemove },
    ]);
  };

  // Edit a logged set (#4)
  const handleEditSet = (setIndex: number, patch: { reps?: number; weight?: number; duration?: number }) => {
    editSet(viewedExercise!.id, setIndex, patch);
  };

  const elapsedMin = Math.floor(secondsElapsed / 60);
  const elapsedSec = secondsElapsed % 60;

  const webBg = Platform.OS === 'web' ? {
    backgroundImage: `repeating-linear-gradient(45deg, rgba(123,47,247,.10) 0 22px, transparent 22px 44px), repeating-linear-gradient(-45deg, rgba(255,46,136,.07) 0 22px, transparent 22px 44px)`,
  } as any : {};

  const webNavBtnShadow = Platform.OS === 'web' ? {
    boxShadow: '6px 6px 0 rgba(0,0,0,.55), 0 0 26px rgba(255,46,136,.6)',
  } as any : {};

  return (
    <View style={[styles.container, webBg]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleAbandon}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <View style={styles.topActionInner}>
            <AppIcon name="action.remove" size={20} active />
            <Text style={styles.abandonBtnText}>Abandon</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.timerPill}>
          <Text style={styles.timerText}>
            ⏱ {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.finishBtn}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <AppIcon name="action.complete" size={20} active />
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise nav dots */}
      <View style={styles.dotRow}>
        {session.exerciseLogs.map((log, i) => {
          const isActive = i === viewedExerciseIndex;
          const isCurrent = i === currentExerciseIndex;
          const isDone = log.sets.length > 0;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                isActive && styles.dotActive,
                isCurrent && styles.dotCurrent,
                isDone && styles.dotDone,
                isActive && isDone && styles.dotActiveDone,
              ]}
            />
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.progressCounter}>
          Exercise {viewedExerciseIndex + 1} of {totalExercises}
          {!isViewingCurrent ? ' · Preview' : ''}
        </Text>

        <ExerciseCard
          key={viewedExercise.id}
          exercise={viewedExercise}
          log={viewedLog}
          target={targets[viewedExercise.id]}
          isCurrentExercise={isViewingCurrent}
          isRestActive={isViewingCurrent && isRestTimerActive}
          restSeconds={restSeconds}
          restEndsAt={restEndsAt}
          canLogExtraSet={canLogExtraSet}
          onAddSet={handleAddSet}
          onLogExtraSet={() => setCurrentExercise(viewedExerciseIndex)}
          onFeedbackChange={(feedback) => setExerciseFeedback(viewedExercise.id, feedback)}
          onRestComplete={stopRestTimer}
          onRestSkip={stopRestTimer}
          onEmomPress={() => setEmomVisible(true)}
          onSwapMid={handleSwapMid}
          onEscalate={handleEscalate}
          onSwapCurrent={handleSwapCurrent}
          onEditSet={handleEditSet}
          onRemoveSet={handleRemoveSet}
        />
      </ScrollView>

      {/* Prev / Next */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, viewedExerciseIndex === 0 && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={viewedExerciseIndex === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navBtn,
            styles.navBtnPrimary,
            viewedExerciseIndex === totalExercises - 1 && styles.navBtnDisabled,
            webNavBtnShadow,
          ]}
          onPress={handleNext}
          disabled={viewedExerciseIndex === totalExercises - 1}
          activeOpacity={0.85}
        >
          <Text style={styles.navBtnPrimaryText}>Next →</Text>
        </TouchableOpacity>
      </View>

      <EmomTimer visible={emomVisible} onClose={() => setEmomVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent.primary,
    backgroundColor: Colors.bg.secondary,
  },
  abandonBtnText: {
    color: Colors.status.error,
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
  },
  timerPill: {
    backgroundColor: Colors.bg.elevated,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  timerText: {
    fontFamily: 'VT323_400Regular',
    fontSize: 18,
    color: Colors.accent.teal,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  finishBtnText: {
    color: Colors.text.inverse,
    fontFamily: 'Anton_400Regular',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.accent.primary,
    width: 24,
  },
  dotCurrent: {
    borderWidth: 1.5,
    borderColor: Colors.accent.acid,
  },
  dotDone: {
    backgroundColor: Colors.accent.teal,
  },
  dotActiveDone: {
    backgroundColor: Colors.accent.primary,
    width: 24,
    borderColor: Colors.accent.teal,
    borderWidth: 1.5,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 130 },
  progressCounter: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.secondary,
    fontSize: 16,
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 1.5,
    borderTopColor: Colors.accent.primary,
  },
  navBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPrimary: {
    backgroundColor: Colors.accent.primary,
    borderColor: Colors.accent.primary,
    flex: 2,
  },
  navBtnDisabled: {
    opacity: 0.2,
  },
  navBtnText: {
    color: Colors.text.secondary,
    fontFamily: 'Anton_400Regular',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  navBtnPrimaryText: {
    color: Colors.text.inverse,
    fontFamily: 'Bungee_400Regular',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  topActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
