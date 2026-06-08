import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
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
    stopRestTimer,
    completeWorkout,
    abandonWorkout,
  } = useActiveSession();

  const { addSession } = useWorkoutHistory();
  const [emomVisible, setEmomVisible] = useState(false);
  // completeWorkout/abandonWorkout clear the session, which re-renders this
  // screen with session=null. Without this flag the guard below would fire
  // router.replace('/') and clobber the navigation those handlers already did.
  const leavingRef = useRef(false);

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
    const finish = () => {
      leavingRef.current = true;
      const completed = completeWorkout();
      if (completed) addSession(completed);
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

  const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleAbandon}>
          <Text style={[Typography.caption, { color: Colors.text.muted }]}>✕ Abandon</Text>
        </TouchableOpacity>
        <Text style={[Typography.mono, { fontSize: 15 }]}>
          {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
        </Text>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise nav dots */}
      <View style={styles.dotRow}>
        {session.exerciseLogs.map((log, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentExerciseIndex && styles.dotActive,
              log.sets.length > 0 && styles.dotDone,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.caption, { marginBottom: 8, color: Colors.text.secondary }]}>
          {currentExerciseIndex + 1} of {totalExercises}
        </Text>

        <ExerciseCard
          key={currentExercise.id}
          exercise={currentExercise}
          log={currentLog}
          target={targets[currentExercise.id]}
          isRestActive={isRestTimerActive}
          restSeconds={restSeconds}
          onAddSet={handleAddSet}
          onRestComplete={stopRestTimer}
          onRestSkip={stopRestTimer}
          onEmomPress={() => setEmomVisible(true)}
        />
      </ScrollView>

      {/* Prev / Next */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentExerciseIndex === 0 && styles.navBtnDisabled]}
          onPress={prevExercise}
          disabled={currentExerciseIndex === 0}
        >
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navBtn,
            styles.navBtnPrimary,
            currentExerciseIndex === totalExercises - 1 && styles.navBtnDisabled,
          ]}
          onPress={nextExercise}
          disabled={currentExerciseIndex === totalExercises - 1}
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  finishBtn: {
    backgroundColor: Colors.status.success,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  finishBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.bg.elevated,
  },
  dotActive: {
    backgroundColor: Colors.accent.primary,
    width: 20,
  },
  dotDone: {
    backgroundColor: Colors.status.success,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  navBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPrimary: {
    backgroundColor: Colors.accent.primary,
    flex: 2,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnText: {
    color: Colors.text.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
});
