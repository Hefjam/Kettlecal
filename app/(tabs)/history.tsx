import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { EXERCISES } from '../../src/data/exercises';
import { WorkoutSession } from '../../src/types';

export default function HistoryScreen() {
  const { sessions } = useWorkoutHistory();

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 48 }}>📋</Text>
        <Text style={[Typography.h2, { marginTop: 16 }]}>No sessions yet</Text>
        <Text style={[Typography.caption, { marginTop: 8, textAlign: 'center' }]}>
          Start your first workout from the Today tab.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
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
      style={styles.card}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={Typography.h2}>
            {new Date(session.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <Text style={[Typography.caption, { marginTop: 2 }]}>
            {session.exerciseLogs.length} exercises · {totalSets} sets · {durationMin} min
          </Text>
        </View>
        <Text style={{ color: Colors.text.muted, fontSize: 18 }}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={styles.logs}>
          {session.exerciseLogs.map((log) => {
            const ex = EXERCISES.find((e) => e.id === log.exerciseId);
            return (
              <View key={log.exerciseId} style={styles.logRow}>
                <Text style={[Typography.body, { flex: 1 }]}>{ex?.name ?? log.exerciseId}</Text>
                <View style={styles.sets}>
                  {log.sets.map((s, i) => (
                    <Text key={i} style={[Typography.caption, styles.setChip]}>
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
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logs: { marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1, justifyContent: 'flex-end' },
  setChip: {
    backgroundColor: Colors.bg.elevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: Colors.text.secondary,
  },
});
