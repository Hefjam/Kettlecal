import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router, Link } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { EXERCISES } from '../../src/data/exercises';
import { useEquipment } from '../../src/stores/useEquipment';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { useRotation } from '../../src/stores/useRotation';
import { useTodayPlan } from '../../src/stores/useTodayPlan';
import { useActiveSession } from '../../src/stores/useActiveSession';
import { useCoachProfile } from '../../src/stores/useCoachProfile';
import { generateWorkout, nextSwapTarget } from '../../src/engine/generateWorkout';
import { dayKey } from '../../src/utils/dayKey';
import { ExerciseTarget } from '../../src/types';

const EMPHASIS_LABEL: Record<string, string> = {
  strength: 'Strength focus',
  skill: 'Skill focus',
  conditioning: 'Conditioning focus',
};

function prescription(t: ExerciseTarget): string {
  if (t.emomMinutes != null) return `EMOM · ${t.targetReps}/min · ${t.emomMinutes} min`;
  if (t.targetSeconds != null) return `${t.sets} × ${t.targetSeconds}s`;
  const reps = t.targetReps != null ? `${t.sets} × ${t.targetReps}` : `${t.sets} sets`;
  return t.weightKg != null ? `${reps} @ ${t.weightKg}kg` : reps;
}

export default function TodayScreen() {
  const equipment = useEquipment((s) => s.equipment);
  const sessions = useWorkoutHistory((s) => s.sessions);
  const lastEmphasis = useRotation((s) => s.lastEmphasis);
  const sessionCount = useRotation((s) => s.sessionCount);
  const coachProfile = useCoachProfile((s) => s.profile);
  const plan = useTodayPlan((s) => s.plan);
  const setPlan = useTodayPlan((s) => s.setPlan);
  const swapTarget = useTodayPlan((s) => s.swapTarget);
  const session = useActiveSession((s) => s.session);
  const startWorkout = useActiveSession((s) => s.startWorkout);

  // Resume banner pulse animation
  const resumeOpacity = useSharedValue(0.8);
  useEffect(() => {
    resumeOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.6, { duration: 1000 })
      ),
      -1,
      true
    );
  }, [resumeOpacity]);

  const animatedResumeStyle = useAnimatedStyle(() => ({
    opacity: resumeOpacity.value,
  }));

  // Generate once per local day (or after a completed session clears the plan).
  useEffect(() => {
    if (!plan || plan.date !== dayKey()) {
      setPlan(generateWorkout(sessions, { lastEmphasis, sessionCount }, equipment, coachProfile));
    }
  }, [plan]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleStart = () => {
    if (!plan || plan.targets.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startWorkout(
      plan.targets.map((t) => ({ exerciseId: t.exerciseId, target: t })),
      plan.emphasis
    );
    router.push('/workout');
  };

  const handleSwap = (index: number) => {
    if (!plan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swapTarget(index, nextSwapTarget(plan, index, sessions, equipment, coachProfile));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.caption, styles.dateText]}>{today}</Text>
        <Text style={[Typography.display, styles.greeting]}>{getGreeting()}</Text>

        {plan && (
          <View style={styles.emphasisBadge}>
            <Text style={styles.emphasisText}>
              🎯 {EMPHASIS_LABEL[plan.emphasis] ?? plan.emphasis}
            </Text>
          </View>
        )}

        {session && (
          <Animated.View style={animatedResumeStyle}>
            <TouchableOpacity
              style={styles.resumeBanner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/workout');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.resumeBannerText}>
                ⚡ Workout in progress — tap to resume
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {plan?.targets.map((t, i) => {
          const ex = EXERCISES.find((e) => e.id === t.exerciseId);
          if (!ex) return null;
          const isKettlebell = ex.category === 'kettlebell';
          return (
            <View
              key={`${t.exerciseId}-${i}`}
              style={[
                styles.card,
                isKettlebell ? styles.cardKettlebell : styles.cardCalisthenics,
              ]}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardCategoryLabel}>
                    {isKettlebell ? 'KETTLEBELL' : 'CALISTHENICS'}
                  </Text>
                  <Text style={Typography.h2}>{ex.name}</Text>
                  <Text style={[Typography.mono, styles.prescription]}>{prescription(t)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.swapBtn}
                  onPress={() => handleSwap(i)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.swapText}>⇄ Swap</Text>
                </TouchableOpacity>
              </View>
              {t.reason && <Text style={[Typography.caption, styles.reason]}>{t.reason}</Text>}
            </View>
          );
        })}

        {plan && plan.targets.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={Typography.h2}>No exercises available today</Text>
            <Text style={[Typography.caption, { marginTop: 8, color: Colors.text.secondary }]}>
              The coach found nothing to program with your current setup. Add gear in the Kit tab, or
              loosen your Coach restrictions, then come back.
            </Text>
          </View>
        )}

        <Link href="/freestyle" asChild>
          <TouchableOpacity style={styles.freestyleLink} activeOpacity={0.7}>
            <Text style={[Typography.caption, { color: Colors.text.secondary, fontWeight: '700' }]}>
              Not feeling this plan? → Freestyle Session
            </Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>

      {plan && plan.targets.length > 0 && (
        <View style={styles.startBar}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>Start Workout ({plan.targets.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 20, paddingBottom: 130 },
  dateText: {
    color: Colors.text.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  greeting: { marginBottom: 14 },
  emphasisBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent.glow,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.accent.glowStrong,
  },
  emphasisText: {
    color: Colors.accent.primary,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resumeBanner: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.status.warning,
    shadowColor: Colors.status.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  resumeBannerText: {
    color: Colors.status.warning,
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardKettlebell: {
    borderLeftColor: Colors.accent.primary,
    borderColor: Colors.border,
  },
  cardCalisthenics: {
    borderLeftColor: Colors.status.info,
    borderColor: Colors.border,
  },
  cardCategoryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text.muted,
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  emptyCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prescription: {
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: 6,
  },
  reason: {
    marginTop: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  swapBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 44, // Ensures touch-target compliance
    justifyContent: 'center',
  },
  swapText: {
    color: Colors.text.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  freestyleLink: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  startBar: {
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
  startBtn: {
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
  startBtnText: {
    color: Colors.text.primary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
