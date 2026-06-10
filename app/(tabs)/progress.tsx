import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { EXERCISES } from '../../src/data/exercises';
import { MovementPattern, WorkoutSession } from '../../src/types';
import { SynthCard } from '../../src/components/SynthCard';

const PATTERN_LABELS: Record<MovementPattern, string> = {
  vertical_pull: 'Vertical pull',
  horizontal_pull: 'Horizontal pull',
  horizontal_push: 'Horizontal push',
  dip: 'Dips',
  vertical_push: 'Vertical push',
  core: 'Core',
  squat: 'Squat',
  lunge: 'Lunge',
  hinge: 'Hinge',
  swing: 'Swing',
  clean: 'Clean',
  press: 'Press',
  row: 'Rows',
  getup: 'Get-up',
  snatch: 'Snatch',
  carry: 'Carry',
  full_body: 'Full body',
};

const webBg = Platform.OS === 'web' ? {
  backgroundImage: `repeating-linear-gradient(45deg, rgba(123,47,247,.10) 0 22px, transparent 22px 44px), repeating-linear-gradient(-45deg, rgba(255,46,136,.07) 0 22px, transparent 22px 44px)`,
} as any : {};

export default function ProgressScreen() {
  const { sessions, getPersonalRecords, getWeeklyVolume } = useWorkoutHistory();
  const prs = getPersonalRecords();
  const volume = getWeeklyVolume();
  const maxVolume = Math.max(...volume.map((v) => v.totalWeightKg), 1);
  const streak = computeStreak(sessions.map((s) => s.date));
  const patternBalance = computePatternBalance(sessions);
  const recentPain = recentPainFlags(sessions);

  return (
    <ScrollView style={[styles.container, webBg]} contentContainerStyle={styles.scroll}>
      {/* Streak */}
      <SynthCard variant="cal" style={styles.streakCard}>
        <Text style={{ fontSize: 36 }}>🔥</Text>
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
        <View style={{ marginLeft: 'auto' }}>
          <Text style={styles.sessionCount}>{sessions.length}</Text>
          <Text style={[Typography.caption, { color: Colors.text.secondary }]}>total sessions</Text>
        </View>
      </SynthCard>

      {/* Volume chart */}
      <Text style={styles.sectionLabel}>Volume (last 14 days)</Text>
      <SynthCard style={styles.chartCard}>
        {volume.length === 0 ? (
          <Text style={[Typography.caption, { textAlign: 'center', padding: 24, color: Colors.text.secondary }]}>
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
                  <Text style={styles.barLabel}>
                    {new Date(v.date).getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </SynthCard>

      {/* Movement balance */}
      <Text style={styles.sectionLabel}>Movement Balance (7 days)</Text>
      <SynthCard style={styles.patternCard}>
        {patternBalance.length === 0 ? (
          <Text style={[Typography.caption, { color: Colors.text.secondary }]}>
            Movement balance appears after logged sets.
          </Text>
        ) : (
          patternBalance.map((item) => (
            <View key={item.pattern} style={styles.patternRow}>
              <Text style={[Typography.caption, { flex: 1, color: Colors.text.primary }]}>
                {PATTERN_LABELS[item.pattern]}
              </Text>
              <View style={styles.patternTrack}>
                <View style={[styles.patternBar, { width: `${item.widthPct}%` as any }]} />
              </View>
              <Text style={styles.patternCount}>{item.sets}</Text>
            </View>
          ))
        )}
      </SynthCard>

      {/* Pain flags */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Recent Pain Flags</Text>
      {recentPain.length === 0 ? (
        <Text style={[Typography.caption, { color: Colors.text.muted }]}>
          Pain you log (4+) shows here. Turn on Auto-Adjust in Coach to have it shape your plan.
        </Text>
      ) : (
        recentPain.map((flag) => (
          <View key={`${flag.sessionId}-${flag.exerciseId}`} style={styles.painRow}>
            <View style={{ flex: 1 }}>
              <Text style={Typography.body}>{flag.exerciseName}</Text>
              <Text style={[Typography.caption, { marginTop: 2, color: Colors.text.secondary }]}>
                {flag.date}
                {flag.rpe != null ? ` · RPE ${flag.rpe}` : ''}
              </Text>
            </View>
            <Text style={styles.painChip}>Pain {flag.pain}</Text>
          </View>
        ))
      )}

      {/* PRs */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Personal Records</Text>
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
  sectionLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.accent.teal,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 13,
    marginBottom: 12,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  streakNumber: {
    fontFamily: 'VT323_400Regular',
    fontSize: 72,
    color: Colors.accent.acid,
    lineHeight: 72,
  },
  streakLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.secondary,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sessionCount: {
    fontFamily: 'VT323_400Regular',
    fontSize: 36,
    color: Colors.accent.acid,
    lineHeight: 36,
  },
  chartCard: {
    height: 170,
    marginBottom: 24,
    padding: 16,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  barWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: 12,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: Colors.accent.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    minHeight: 6,
  },
  barLabel: {
    fontFamily: 'VT323_400Regular',
    marginTop: 6,
    color: Colors.text.muted,
    fontSize: 14,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
  },
  prStats: { flexDirection: 'row', gap: 6 },
  prChip: {
    backgroundColor: 'rgba(255,46,136,0.15)',
    color: Colors.accent.acid,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: Colors.accent.primary,
  },
  patternCard: {
    marginBottom: 0,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  patternTrack: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patternBar: {
    height: '100%',
    backgroundColor: Colors.accent.teal,
    borderRadius: 5,
  },
  patternCount: {
    fontFamily: 'VT323_400Regular',
    width: 28,
    textAlign: 'right',
    color: Colors.text.primary,
    fontSize: 18,
  },
  painRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.status.warning,
    padding: 14,
    marginBottom: 8,
  },
  painChip: {
    backgroundColor: 'rgba(246,224,94,0.12)',
    color: Colors.status.warning,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '800',
    borderWidth: 1.5,
    borderColor: Colors.status.warning,
  },
});
