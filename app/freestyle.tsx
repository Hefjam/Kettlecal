import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { EXERCISES } from '../src/data/exercises';
import { useEquipment } from '../src/stores/useEquipment';
import { useActiveSession } from '../src/stores/useActiveSession';
import { freestyleExerciseOptions } from '../src/data/freestyle';
import { Exercise } from '../src/types';
import { SynthCard } from '../src/components/SynthCard';

// The manual picker, demoted from the front door. A freestyle session carries no
// coach targets and no emphasis, so completing it does NOT advance the rotation.
export default function FreestyleScreen() {
  const equipment = useEquipment((s) => s.equipment);
  const startWorkout = useActiveSession((s) => s.startWorkout);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'calisthenics' | 'kettlebell'>('all');

  const availableExercises = freestyleExerciseOptions(equipment, EXERCISES);
  const filtered = availableExercises.filter(
    (ex) => filter === 'all' || ex.category === filter
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleStart = () => {
    if (selected.length === 0) return;
    startWorkout(selected.map((id) => ({ exerciseId: id })));
    router.push('/workout');
  };

  const webBg = Platform.OS === 'web' ? {
    backgroundImage: `repeating-linear-gradient(45deg, rgba(123,47,247,.10) 0 22px, transparent 22px 44px), repeating-linear-gradient(-45deg, rgba(255,46,136,.07) 0 22px, transparent 22px 44px)`,
  } as any : {};

  const webTitleStyle = Platform.OS === 'web' ? {
    textShadow: '3px 0 #ff2e88, -3px 0 #19e0c8',
  } as any : {};

  const webStartBtnStyle = Platform.OS === 'web' ? {
    boxShadow: '6px 6px 0 rgba(0,0,0,.55), 0 0 26px rgba(255,46,136,.6)',
  } as any : {};

  return (
    <View style={[styles.container, webBg]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, webTitleStyle]}>Freestyle</Text>
        <Text style={styles.subtitle}>Pick your own session</Text>

        <View style={styles.filterRow}>
          {(['all', 'calisthenics', 'kettlebell'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.pickLabel}>
          Pick exercises ({selected.length} selected)
        </Text>
        {filtered.map((ex) => (
          <ExerciseRow
            key={ex.id}
            exercise={ex}
            selected={selected.includes(ex.id)}
            onPress={() => toggle(ex.id)}
          />
        ))}
      </ScrollView>

      {selected.length > 0 && (
        <View style={styles.startBar}>
          <TouchableOpacity
            style={[styles.startBtn, webStartBtnStyle]}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>▶ Start Workout ({selected.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ExerciseRow({
  exercise,
  selected,
  onPress,
}: {
  exercise: Exercise;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <SynthCard
        style={StyleSheet.flatten([
          styles.exerciseRowCard,
          selected ? styles.exerciseRowCardSelected : undefined,
        ])}
      >
        <View style={styles.exerciseRowInner}>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise.name.toUpperCase()}</Text>
            <Text style={styles.exerciseMuscles}>
              {exercise.muscleGroups.join(' · ')}
            </Text>
          </View>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </SynthCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 20, paddingBottom: 120 },
  title: {
    fontFamily: 'Bungee_400Regular',
    textTransform: 'uppercase',
    fontSize: 36,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'VT323_400Regular',
    fontSize: 18,
    color: Colors.accent.teal,
    letterSpacing: 1,
    marginBottom: 20,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(255,46,136,0.15)',
    borderColor: Colors.accent.primary,
  },
  filterBtnText: {
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
    color: Colors.text.secondary,
  },
  filterBtnTextActive: {
    color: Colors.accent.acid,
  },
  pickLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.accent.teal,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 13,
    marginBottom: 8,
  },
  exerciseRowCard: {
    marginBottom: 8,
    padding: 14,
  },
  exerciseRowCardSelected: {
    borderColor: Colors.accent.primary,
    backgroundColor: 'rgba(255,46,136,0.08)',
  },
  exerciseRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.primary,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  exerciseMuscles: {
    fontFamily: 'VT323_400Regular',
    fontSize: 15,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  checkmark: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.teal,
    fontSize: 28,
    marginLeft: 8,
  },
  startBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.accent.primary,
  },
  startBtn: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 4,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: Colors.text.inverse,
    fontFamily: 'Bungee_400Regular',
    fontSize: 17,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
