import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { EXERCISES } from '../../src/data/exercises';
import { useEquipment } from '../../src/stores/useEquipment';
import { useActiveSession } from '../../src/stores/useActiveSession';
import { Exercise } from '../../src/types';

export default function TodayScreen() {
  const { equipment } = useEquipment();
  const { session, startWorkout } = useActiveSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'calisthenics' | 'kettlebell'>('all');

  const availableExercises = EXERCISES.filter((ex) =>
    ex.equipment.some((e) => equipment.items.includes(e))
  );

  const filtered = availableExercises.filter(
    (ex) => filter === 'all' || ex.category === filter
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleStart = () => {
    if (selected.length === 0) return;
    startWorkout(selected);
    router.push('/workout');
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.display, styles.greeting]}>Ready to train?</Text>
        <Text style={[Typography.caption, { marginBottom: 24 }]}>{today}</Text>

        {session && (
          <TouchableOpacity style={styles.resumeBanner} onPress={() => router.push('/workout')}>
            <Text style={[Typography.body, { color: Colors.status.warning, fontWeight: '700' }]}>
              ⚡ Workout in progress — tap to resume
            </Text>
          </TouchableOpacity>
        )}

        {/* Category filter */}
        <View style={styles.filterRow}>
          {(['all', 'calisthenics', 'kettlebell'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  Typography.caption,
                  { color: filter === f ? Colors.accent.primary : Colors.text.secondary },
                ]}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercise picker */}
        <Text style={[Typography.label, { marginBottom: 8 }]}>
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

      {/* Start button */}
      {selected.length > 0 && (
        <View style={styles.startBar}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>Start Workout ({selected.length})</Text>
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
    <TouchableOpacity
      style={[styles.exerciseRow, selected && styles.exerciseRowSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseInfo}>
        <Text style={Typography.body}>{exercise.name}</Text>
        <Text style={[Typography.caption, { marginTop: 2 }]}>
          {exercise.muscleGroups.join(' · ')}
        </Text>
      </View>
      {selected && <Text style={{ color: Colors.status.success, fontSize: 20 }}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 20, paddingBottom: 120 },
  greeting: { marginBottom: 4 },
  resumeBanner: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.status.warning,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
  },
  filterBtnActive: {
    backgroundColor: Colors.accent.glow,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exerciseRowSelected: {
    borderColor: Colors.accent.primary,
    backgroundColor: Colors.bg.elevated,
  },
  exerciseInfo: { flex: 1 },
  startBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startBtn: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: Colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
  },
});
