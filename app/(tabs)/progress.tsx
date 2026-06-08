import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { EXERCISES } from '../../src/data/exercises';
import { MovementPattern, WorkoutSession } from '../../src/types';

const PATTERN_LABELS: Record<MovementPattern, string> = {
  vertical_pull: 'Vertical pull',
  horizontal_pull: 'Horizontal pull',
  horizontal_push: 'Horizontal push',
  dip: 'Dips',
  vertical_push: 'Vertical push',
  core: 'Core',
  squat: 'Squat',
  hinge: 'Hinge',
  swing: 'Swing',
  clean: 'Clean',
  press: 'Press',
  row: 'Rows',
  getup: 'Get-up',
  snatch: 'Snatch',
  full_body: 'Full body',
};

export default function ProgressScreen() {
  const { sessions, getPersonalRecords, getWeeklyVolume } = useWorkoutHistory();
  const prs = getPersonalRecords();
  const volume = getWeeklyVolume();
  const maxVolume = Math.max(...volume.map((v) => v.totalWeightKg), 1);
  const streak = computeStreak(sessions.map((s) => s.date));
  const patternBalance = computePatternBalance(sessions);
  const recentPain = recentPainFlags(sessions);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Streak */}
      <View style={styles.streakCard}>
        <Text style={{ fontSize: 36 }}>🔥</Text>
        <View style={{ marginLeft: 16 }}>
          <Text style={[Typography.monoLarge, { color: Colors.accent.primary }]}>{streak}</Text>
          <Text style={Typography.caption}>day streak</Text>
        </View>
        <View style={{ marginLeft: 'auto' }}>
          <Text style={[Typography.mono, { color: Colors.text.secondary }]}>{sessions.length}</Text>
          <Text style={Typography.caption}>total sessions</Text>
        </View>
      </View>

      {/* Volume chart */}
      <Text style={[Typography.label, { marginBottom: 12 }]}>Volume (last 14 days)</Text>
      <View style={styles.chart}>
        {volume.length === 0 ? (
          <Text style={[Typography.caption, { textAlign: 'center', padding: 24 }]}>
            No data yet — complete a workout to see volume.
          </Text>
        ) : (
          <View style={styles.bars}>
            {volume.map((v) => {
              const heightPct = maxVolume > 0 ? (v.totalWeightKg / maxVolume) * 100 : 0;
              return (
                <View key={v.date} style={styles.barWrapper}>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: `${heightPct}%` as any }]} />
                  </View>
                  <Text style={[Typography.caption, styles.barLabel]}>
                    {new Date(v.date).getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <Text style={[Typography.label, { marginBottom: 12 }]}>Movement Balance (7 days)</Text>
      <View style={styles.patternCard}>
        {patternBalance.length === 0 ? (
          <Text style={[Typography.caption, { color: Colors.text.secondary }]}>
            Movement balance appears after logged sets.
          </Text>
        ) : (
          patternBalance.map((item) => (
            <View key={item.pattern} style={styles.patternRow}>
              <Text style={[Typography.caption, { flex: 1 }]}>
                {PATTERN_LABELS[item.pattern]}
              </Text>
              <View style={styles.patternTrack}>
                <View style={[styles.patternBar, { width: `${item.widthPct}%` as any }]} />
              </View>
              <Text style={[Typography.mono, styles.patternCount]}>{item.sets}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={[Typography.label, { marginTop: 24, marginBottom: 12 }]}>Recent Pain Flags</Text>
      {recentPain.length === 0 ? (
        <Text style={[Typography.caption, { color: Colors.text.muted }]}>
          Pain you log (4+) shows here. Turn on Auto-Adjust in Coach to have it shape your plan.
        </Text>
      ) : (
        recentPain.map((flag) => (
          <View key={`${flag.sessionId}-${flag.exerciseId}`} style={styles.painRow}>
            <View style={{ flex: 1 }}>
              <Text style={Typography.body}>{flag.exerciseName}</Text>
              <Text style={[Typography.caption, { marginTop: 2 }]}>
                {flag.date}
                {flag.rpe != null ? ` · RPE ${flag.rpe}` : ''}
              </Text>
            </View>
            <Text style={styles.painChip}>Pain {flag.pain}</Text>
          </View>
        ))
      )}

      {/* PRs */}
      <Text style={[Typography.label, { marginTop: 24, marginBottom: 12 }]}>Personal Records</Text>
      {Object.keys(prs).length === 0 ? (
        <Text style={[Typography.caption, { color: Colors.text.muted }]}>
          PRs will appear after your first workout.
        </Text>
      ) : (
        Object.entries(prs).map(([exerciseId, pr]) => {
          const ex = EXERCISES.find((e) => e.id === exerciseId);
          return (
            <View key={exerciseId} style={styles.prRow}>
              <Text style={[Typography.body, { flex: 1 }]}>{ex?.name ?? exerciseId}</Text>
              <View style={styles.prStats}>
                {pr.maxReps > 0 && (
                  <Text style={styles.prChip}>{pr.maxReps} reps</Text>
                )}
                {pr.maxWeight > 0 && (
                  <Text style={styles.prChip}>{pr.maxWeight}kg</Text>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function computePatternBalance(sessions: WorkoutSession[]) {
  const cutoff = Date.now() - 7 * 86400000;
  const counts = new Map<MovementPattern, number>();
  for (const session of sessions) {
    if (new Date(session.date).getTime() < cutoff) continue;
    for (const log of session.exerciseLogs) {
      const setCount = log.sets.length;
      if (setCount === 0) continue;
      const exercise = EXERCISES.find((e) => e.id === log.exerciseId);
      for (const pattern of exercise?.movementPatterns ?? []) {
        counts.set(pattern, (counts.get(pattern) ?? 0) + setCount);
      }
    }
  }
  const max = Math.max(...counts.values(), 1);
  return Array.from(counts.entries())
    .map(([pattern, sets]) => ({ pattern, sets, widthPct: Math.max(8, (sets / max) * 100) }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 6);
}

function recentPainFlags(sessions: WorkoutSession[]) {
  const flags: {
    sessionId: string;
    exerciseId: string;
    exerciseName: string;
    date: string;
    pain: number;
    rpe?: number;
  }[] = [];
  for (const session of sessions.slice(0, 6)) {
    for (const log of session.exerciseLogs) {
      const pain = log.feedback?.pain;
      if (pain == null || pain < 4) continue;
      const exercise = EXERCISES.find((e) => e.id === log.exerciseId);
      flags.push({
        sessionId: session.id,
        exerciseId: log.exerciseId,
        exerciseName: exercise?.name ?? log.exerciseId,
        date: new Date(session.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        pain,
        rpe: log.feedback?.rpe,
      });
    }
  }
  return flags.slice(0, 5);
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates.map((d) => d.slice(0, 10)))].sort().reverse();
  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);
  for (const d of unique) {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = (current.getTime() - day.getTime()) / 86400000;
    if (diff <= 1) {
      streak++;
      current = day;
    } else break;
  }
  return streak;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 20, paddingBottom: 40 },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  chart: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    height: 160,
    marginBottom: 24,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    marginTop: 4,
    color: Colors.text.muted,
    fontSize: 10,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  prStats: { flexDirection: 'row', gap: 6 },
  prChip: {
    backgroundColor: Colors.accent.glow,
    color: Colors.accent.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  patternCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  patternTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  patternBar: {
    height: 8,
    backgroundColor: Colors.accent.primary,
    borderRadius: 4,
  },
  patternCount: {
    width: 28,
    textAlign: 'right',
    color: Colors.text.secondary,
    fontSize: 12,
  },
  painRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  painChip: {
    backgroundColor: Colors.status.warning,
    color: Colors.bg.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '800',
  },
});
