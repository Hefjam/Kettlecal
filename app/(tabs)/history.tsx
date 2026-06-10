import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { EXERCISES } from '../../src/data/exercises';
import { WorkoutSession } from '../../src/types';
import { SynthCard } from '../../src/components/SynthCard';

const webBg = Platform.OS === 'web' ? {
  backgroundImage: `repeating-linear-gradient(45deg, rgba(123,47,247,.10) 0 22px, transparent 22px 44px), repeating-linear-gradient(-45deg, rgba(255,46,136,.07) 0 22px, transparent 22px 44px)`,
} as any : {};

export default function HistoryScreen() {
  const { sessions } = useWorkoutHistory();

  if (sessions.length === 0) {
    return (
      <View style={[styles.empty, webBg]}>
        <Text style={{ fontSize: 48 }}>📋</Text>
        <Text style={styles.emptyTitle}>No sessions yet</Text>
        <Text style={[Typography.caption, { marginTop: 8, textAlign: 'center', color: Colors.text.secondary }]}>
          Start your first workout from the Today tab.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.list, webBg]}
      contentContainerStyle={{ padding: 16 }}
      data={sessions}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <SessionCard session={item} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function SessionCard({ session }: { session: WorkoutSession }) {
  const [expanded, setExpanded] = React.useState(false);
  const durationMin = session.durationMs ? Math.round(session.durationMs / 60000) : 0;
  const totalSets = session.exerciseLogs.reduce((a, l) => a + l.sets.length, 0);

  return (
    <TouchableOpacity
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.8}
    >
      <SynthCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardDate}>
              {new Date(session.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }).toUpperCase()}
            </Text>
            <Text style={styles.cardStats}>
              {session.exerciseLogs.length} exercises · {totalSets} sets · {durationMin} min
            </Text>
          </View>
          <Text style={styles.expandArrow}>{expanded ? '▲' : '▼'}</Text>
        </View>

        {expanded && (
          <View style={styles.logs}>
            {session.exerciseLogs.map((log) => {
              const ex = EXERCISES.find((e) => e.id === log.exerciseId);
              return (
                <View key={log.exerciseId} style={styles.logRow}>
                  <Text style={styles.logExerciseName}>{ex?.name ?? log.exerciseId}</Text>
                  <View style={styles.sets}>
                    {log.sets.map((s, i) => (
                      <Text key={i} style={styles.setChip}>
                        {s.reps != null ? `${s.reps}r` : ''}
                        {s.weight != null ? `·${s.weight}kg` : ''}
                        {s.duration != null ? `${s.duration}s` : ''}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </SynthCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg.primary },
  empty: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontFamily: 'Bungee_400Regular',
    textTransform: 'uppercase',
    color: Colors.text.primary,
    fontSize: 22,
    marginTop: 16,
  },
  card: {
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontFamily: 'Anton_400Regular',
    textTransform: 'uppercase',
    color: Colors.text.primary,
    fontSize: 16,
    letterSpacing: 1,
  },
  cardStats: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.secondary,
    fontSize: 18,
    marginTop: 2,
  },
  expandArrow: {
    color: Colors.accent.teal,
    fontSize: 18,
  },
  logs: {
    marginTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  logExerciseName: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.primary,
    fontSize: 14,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1, justifyContent: 'flex-end' },
  setChip: {
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
    color: Colors.accent.acid,
    backgroundColor: Colors.bg.elevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
