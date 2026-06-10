import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { EXERCISES } from '../../src/data/exercises';

export default function CompleteScreen() {
  const { sessions } = useWorkoutHistory();
  const latest = sessions[0];

  // Trophy scale animation
  const trophyScale = useSharedValue(0.3);

  useEffect(() => {
    trophyScale.value = withSpring(1.0, { damping: 7, stiffness: 80 });
  }, [trophyScale]);

  const animatedTrophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));

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

  const handleHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={animatedTrophyStyle}>
          <Text style={styles.trophy}>🏆</Text>
        </Animated.View>
        
        <Text style={[Typography.display, styles.title]}>Session Complete</Text>
        <Text style={[Typography.caption, { marginBottom: 32, fontWeight: '700', textTransform: 'uppercase', color: Colors.text.secondary }]}>
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

        <Text style={[Typography.label, { alignSelf: 'flex-start', marginBottom: 12 }]}>Exercises Completed</Text>
        <View style={styles.exerciseList}>
          {latest.exerciseLogs.map((log) => {
            const ex = EXERCISES.find((e) => e.id === log.exerciseId);
            if (!ex) return null;
            return (
              <View key={log.exerciseId} style={styles.exerciseRow}>
                <Text style={[Typography.body, { fontWeight: '700' }]}>{ex.name}</Text>
                <View style={styles.exerciseSetsBadge}>
                  <Text style={styles.exerciseSetsText}>
                    {log.sets.length} Sets
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <TouchableOpacity style={styles.homeBtn} onPress={handleHome} activeOpacity={0.85}>
          <Text style={styles.homeBtnText}>Back to Today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[Typography.monoLarge, { color: Colors.accent.primary, fontSize: 36, lineHeight: 40 }]}>{value}</Text>
      <Text style={[Typography.caption, { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, fontSize: 11 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 24, alignItems: 'center', paddingBottom: 120 },
  trophy: { fontSize: 80, marginBottom: 16 },
  title: { textAlign: 'center', marginBottom: 6 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  exerciseList: { width: '100%', gap: 10 },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
  },
  exerciseSetsBadge: {
    backgroundColor: Colors.accent.glow,
    borderWidth: 1,
    borderColor: Colors.accent.glowStrong,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  exerciseSetsText: {
    color: Colors.accent.primary,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg.primary,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
  },
  homeBtn: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  homeBtnText: { color: Colors.text.primary, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
});
