import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { EXERCISES } from '../../src/data/exercises';

export default function CompleteScreen() {
  const { sessions } = useWorkoutHistory();
  const latest = sessions[0];

  if (!latest) {
    router.replace('/');
    return null;
  }

  const durationMin = latest.durationMs ? Math.round(latest.durationMs / 60000) : 0;
  const totalSets = latest.exerciseLogs.reduce((a, l) => a + l.sets.length, 0);
  const totalReps = latest.exerciseLogs.reduce(
    (a, l) => a + l.sets.reduce((b, s) => b + (s.reps ?? 0), 0),
    0
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={[Typography.display, styles.title]}>Session Complete</Text>
        <Text style={[Typography.caption, { marginBottom: 32 }]}>
          {new Date(latest.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        <View style={styles.statsRow}>
          <Stat value={String(durationMin)} label="minutes" />
          <Stat value={String(totalSets)} label="sets" />
          <Stat value={String(totalReps)} label="reps" />
        </View>

        <View style={styles.exerciseList}>
          {latest.exerciseLogs.map((log) => {
            const ex = EXERCISES.find((e) => e.id === log.exerciseId);
            if (!ex) return null;
            return (
              <View key={log.exerciseId} style={styles.exerciseRow}>
                <Text style={Typography.body}>{ex.name}</Text>
                <Text style={[Typography.caption, { color: Colors.text.secondary }]}>
                  {log.sets.length} sets
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/')}>
          <Text style={styles.homeBtnText}>Back to Today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={Typography.monoLarge}>{value}</Text>
      <Text style={Typography.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 24, alignItems: 'center', paddingBottom: 120 },
  trophy: { fontSize: 64, marginBottom: 16 },
  title: { textAlign: 'center', marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  exerciseList: { width: '100%', gap: 8 },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
  },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg.primary,
  },
  homeBtn: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
});
