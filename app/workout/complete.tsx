import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { EXERCISES } from '../../src/data/exercises';
import { SynthCard } from '../../src/components/SynthCard';

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

  const webBg = Platform.OS === 'web' ? {
    backgroundImage: `repeating-linear-gradient(45deg, rgba(123,47,247,.10) 0 22px, transparent 22px 44px), repeating-linear-gradient(-45deg, rgba(255,46,136,.07) 0 22px, transparent 22px 44px)`,
  } as any : {};

  const webTitleStyle = Platform.OS === 'web' ? {
    textShadow: '3px 0 #ff2e88, -3px 0 #19e0c8, 0 0 22px rgba(255,46,136,.5)',
  } as any : {};

  const webHomeBtnStyle = Platform.OS === 'web' ? {
    boxShadow: '6px 6px 0 rgba(0,0,0,.55), 0 0 26px rgba(255,46,136,.6)',
  } as any : {};

  return (
    <View style={[styles.container, webBg]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={animatedTrophyStyle}>
          <Text style={styles.trophy}>🏆</Text>
        </Animated.View>

        <Text style={[styles.title, webTitleStyle]}>Session Complete</Text>
        <Text style={styles.dateSubtitle}>
          {new Date(latest.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }).toUpperCase()}
        </Text>

        <View style={styles.statsRow}>
          <Stat value={String(durationMin)} label="minutes" />
          <Stat value={String(totalSets)} label="sets" />
          <Stat value={String(totalReps)} label="reps" />
        </View>

        <Text style={styles.exercisesLabel}>Exercises Completed</Text>
        <View style={styles.exerciseList}>
          {latest.exerciseLogs.map((log) => {
            const ex = EXERCISES.find((e) => e.id === log.exerciseId);
            if (!ex) return null;
            return (
              <SynthCard key={log.exerciseId} style={styles.exerciseRowCard}>
                <View style={styles.exerciseRowInner}>
                  <Text style={styles.exerciseName}>{ex.name.toUpperCase()}</Text>
                  <View style={styles.exerciseSetsBadge}>
                    <Text style={styles.exerciseSetsText}>
                      {log.sets.length} Sets
                    </Text>
                  </View>
                </View>
              </SynthCard>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.homeBtn, webHomeBtnStyle]}
          onPress={handleHome}
          activeOpacity={0.85}
        >
          <Text style={styles.homeBtnText}>Back to Today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <SynthCard style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </SynthCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 24, alignItems: 'center', paddingBottom: 120 },
  trophy: { fontSize: 80, marginBottom: 16 },
  title: {
    fontFamily: 'Bungee_400Regular',
    textTransform: 'uppercase',
    fontSize: 36,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  dateSubtitle: {
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: 32,
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32, width: '100%' },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  statValue: {
    fontFamily: 'VT323_400Regular',
    fontSize: 64,
    color: Colors.accent.acid,
    lineHeight: 68,
  },
  statLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.secondary,
    fontSize: 11,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  exercisesLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.accent.teal,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 13,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  exerciseList: { width: '100%' },
  exerciseRowCard: { marginBottom: 10 },
  exerciseRowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.primary,
    fontSize: 14,
    textTransform: 'uppercase',
    flex: 1,
  },
  exerciseSetsBadge: {
    backgroundColor: 'rgba(255,46,136,0.15)',
    borderWidth: 1,
    borderColor: Colors.accent.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  exerciseSetsText: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    fontSize: 16,
  },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 1.5,
    borderTopColor: Colors.accent.primary,
  },
  homeBtn: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 4,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    color: Colors.text.inverse,
    fontFamily: 'Bungee_400Regular',
    fontSize: 17,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
