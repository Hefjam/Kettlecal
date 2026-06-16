import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
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
import { SynthCard } from '../../src/components/SynthCard';
import { AppIcon } from '../../src/components/icons/AppIcons';

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

const webBg = Platform.OS === 'web' ? {
  backgroundImage: `repeating-linear-gradient(45deg, rgba(123,47,247,.10) 0 22px, transparent 22px 44px), repeating-linear-gradient(-45deg, rgba(255,46,136,.07) 0 22px, transparent 22px 44px), radial-gradient(120% 60% at 50% 0%, rgba(255,46,136,.20), transparent 55%)`,
} as any : {};

const webGreetShadow = Platform.OS === 'web' ? {
  textShadow: '3px 0 #ff2e88, -3px 0 #19e0c8, 0 0 22px rgba(255,46,136,.5)',
} as any : {};

const webStartBtnShadow = Platform.OS === 'web' ? {
  boxShadow: '6px 6px 0 rgba(0,0,0,.55), 0 0 26px rgba(255,46,136,.6)',
} as any : {};

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
    <View style={[styles.container, webBg]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.dateText}>{today.toUpperCase()}</Text>
        <Text style={[styles.greeting, webGreetShadow]}>{getGreeting()}</Text>

        {plan && (
          <View style={styles.emphasisBadge}>
            <AppIcon name="action.skillFocus" size={18} active />
            <Text style={styles.emphasisText}>
              {EMPHASIS_LABEL[plan.emphasis] ?? plan.emphasis}
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
            <SynthCard
              key={`${t.exerciseId}-${i}`}
              variant={isKettlebell ? 'kb' : 'cal'}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardCategoryLabel, { color: isKettlebell ? Colors.accent.primary : Colors.accent.teal }]}>
                    {isKettlebell ? 'KETTLEBELL' : 'CALISTHENICS'}
                  </Text>
                  <Text style={styles.exerciseName}>{ex.name.toUpperCase()}</Text>
                  <Text style={styles.prescription}>{prescription(t)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.swapBtn}
                  onPress={() => handleSwap(i)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <AppIcon name="action.swapExercise" size={20} active />
                  <Text style={styles.swapText}>Swap</Text>
                </TouchableOpacity>
              </View>
              {t.reason && <Text style={styles.reason}>// {t.reason}</Text>}
            </SynthCard>
          );
        })}

        {plan && plan.targets.length === 0 && (
          <SynthCard>
            <Text style={styles.exerciseName}>No exercises available today</Text>
            <Text style={[styles.reason, { marginTop: 8, borderTopWidth: 0, paddingTop: 0 }]}>
              The coach found nothing to program with your current setup. Add gear in the Kit tab, or
              loosen your Coach restrictions, then come back.
            </Text>
          </SynthCard>
        )}

        <Link href="/freestyle" asChild>
          <TouchableOpacity style={styles.freestyleLink} activeOpacity={0.7}>
            <Text style={styles.freestyleLinkText}>» Freestyle Session «</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>

      {plan && plan.targets.length > 0 && (
        <View style={styles.startBar}>
          <TouchableOpacity style={[styles.startBtn, webStartBtnShadow]} onPress={handleStart} activeOpacity={0.85}>
            <AppIcon name="action.startWorkout" size={28} active />
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
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.teal,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  greeting: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 46,
    textTransform: 'uppercase',
    lineHeight: 44,
    color: Colors.text.primary,
    marginBottom: 14,
  },
  emphasisBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accent.acid,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 24,
  },
  emphasisText: {
    color: Colors.text.inverse,
    fontFamily: 'Anton_400Regular',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  resumeBanner: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.accent.primary,
  },
  resumeBannerText: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCategoryLabel: {
    fontFamily: 'Anton_400Regular',
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 4,
  },
  exerciseName: {
    fontFamily: 'Anton_400Regular',
    fontSize: 24,
    textTransform: 'uppercase',
    color: Colors.text.primary,
  },
  prescription: {
    fontFamily: 'VT323_400Regular',
    fontSize: 28,
    color: Colors.accent.acid,
    letterSpacing: 1,
    marginTop: 4,
  },
  reason: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.secondary,
    fontSize: 16,
    letterSpacing: 1,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.text.secondary + '66',
    minHeight: 44,
    justifyContent: 'center',
  },
  swapText: {
    fontFamily: 'VT323_400Regular',
    fontSize: 18,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  freestyleLink: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  freestyleLinkText: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.teal,
    fontSize: 18,
    letterSpacing: 1,
  },
  startBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 2,
    borderTopColor: Colors.accent.primary,
  },
  startBtn: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.accent.primary,
    borderRadius: 4,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.text.inverse,
  },
});
