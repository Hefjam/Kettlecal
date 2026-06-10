import React, { useRef, useState, useEffect } from 'react';
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
import { Typography } from '../../src/theme/typography';
import { EXERCISES } from '../../src/data/exercises';
import { useActiveSession } from '../../src/stores/useActiveSession';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { ExerciseCard } from '../../src/components/ExerciseCard';
import { EmomTimer } from '../../src/components/EmomTimer';
import { Set } from '../../src/types';

export default function WorkoutScreen() {
  const {
    session,
    currentExerciseIndex,
    isRestTimerActive,
    restSeconds,
    targets,
    nextExercise,
    prevExercise,
    addSet,
    setExerciseFeedback,
    stopRestTimer,
    completeWorkout,
    abandonWorkout,
  } = useActiveSession();

  const { addSession } = useWorkoutHistory();
  const [emomVisible, setEmomVisible] = useState(false);
  const leavingRef = useRef(false);

  // Active workout clock ticker
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
  const currentExercise = EXERCISES.find((e) => e.id === currentLog?.exerciseId);
  const totalExercises = session.exerciseLogs.length;

  if (!currentExercise || !currentLog) return null;

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

  const elapsedMin = Math.floor(secondsElapsed / 60);
  const elapsedSec = secondsElapsed % 60;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleAbandon}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.abandonBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.abandonBtnText}>✕ Abandon</Text>
        </TouchableOpacity>

        <View style={styles.timerPill}>
          <Text style={styles.timerText}>
            ⏱️ {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.finishBtn}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise nav dots */}
      <View style={styles.dotRow}>
        {session.exerciseLogs.map((log, i) => {
          const isActive = i === currentExerciseIndex;
          const isDone = log.sets.length > 0;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                isActive && styles.dotActive,
                isDone && styles.dotDone,
                isActive && isDone && styles.dotActiveDone,
              ]}
            />
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.progressCounter}>
          Exercise {currentExerciseIndex + 1} of {totalExercises}
        </Text>

        <ExerciseCard
          key={currentExercise.id}
          exercise={currentExercise}
          log={currentLog}
          target={targets[currentExercise.id]}
          isRestActive={isRestTimerActive}
          restSeconds={restSeconds}
          onAddSet={handleAddSet}
          onFeedbackChange={(feedback) => setExerciseFeedback(currentExercise.id, feedback)}
          onRestComplete={stopRestTimer}
          onRestSkip={stopRestTimer}
          onEmomPress={() => setEmomVisible(true)}
        />
      </ScrollView>

      {/* Prev / Next */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentExerciseIndex === 0 && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={currentExerciseIndex === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navBtn,
            styles.navBtnPrimary,
            currentExerciseIndex === totalExercises - 1 && styles.navBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={currentExerciseIndex === totalExercises - 1}
          activeOpacity={0.85}
        >
          <Text style={[styles.navBtnText, { color: Colors.text.primary }]}>Next →</Text>
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
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg.secondary,
  },
  abandonBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  abandonBtnText: {
    color: Colors.status.error,
    fontWeight: '700',
    fontSize: 13,
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
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text.secondary,
  },
  finishBtn: {
    backgroundColor: Colors.status.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: Colors.status.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  finishBtnText: {
    color: Colors.text.primary,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  dotDone: {
    backgroundColor: Colors.status.success,
  },
  dotActiveDone: {
    backgroundColor: Colors.accent.primary,
    width: 24,
    borderColor: Colors.status.success,
    borderWidth: 1.5,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 130 },
  progressCounter: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    backgroundColor: Colors.bg.primary,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
  },
  navBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPrimary: {
    backgroundColor: Colors.accent.primary,
    borderColor: Colors.accent.primary,
    flex: 2,
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  navBtnDisabled: {
    opacity: 0.25,
  },
  navBtnText: {
    color: Colors.text.secondary,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
