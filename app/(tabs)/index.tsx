import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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

  // Generate once per local day (or after a completed session clears the plan).
  useEffect(() => {
    if (!plan || plan.date !== dayKey()) {
      setPlan(generateWorkout(sessions, { lastEmphasis, sessionCount }, equipment, coachProfile));
    }
    // Intentionally keyed on `plan` only: regenerate on day-turnover / post-completion,
    // not when equipment or history shift mid-day (that would wipe swaps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleStart = () => {
    if (!plan || plan.targets.length === 0) return;
    startWorkout(
      plan.targets.map((t) => ({ exerciseId: t.exerciseId, target: t })),
      plan.emphasis
    );
    router.push('/workout');
  };

  const handleSwap = (index: number) => {
    if (!plan) return;
    swapTarget(index, nextSwapTarget(plan, index, sessions, equipment, coachProfile));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.display, styles.greeting]}>Today</Text>
        <Text style={[Typography.caption, { marginBottom: 16 }]}>{today}</Text>

        {plan && (
          <View style={styles.emphasisBadge}>
            <Text style={styles.emphasisText}>
              {EMPHASIS_LABEL[plan.emphasis] ?? plan.emphasis}
            </Text>
          </View>
        )}

        {session && (
          <TouchableOpacity style={styles.resumeBanner} onPress={() => router.push('/workout')}>
            <Text style={[Typography.body, { color: Colors.status.warning, fontWeight: '700' }]}>
              ⚡ Workout in progress — tap to resume
            </Text>
          </TouchableOpacity>
        )}

        {plan?.targets.map((t, i) => {
          const ex = EXERCISES.find((e) => e.id === t.exerciseId);
          if (!ex) return null;
          return (
            <View key={`${t.exerciseId}-${i}`} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={Typography.body}>{ex.name}</Text>
                  <Text style={[Typography.mono, styles.prescription]}>{prescription(t)}</Text>
                </View>
                <TouchableOpacity style={styles.swapBtn} onPress={() => handleSwap(i)}>
                  <Text style={styles.swapText}>⇄ Swap</Text>
                </TouchableOpacity>
              </View>
              <Text style={[Typography.caption, styles.reason]}>{t.reason}</Text>
            </View>
          );
        })}

        {plan && plan.targets.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={Typography.body}>No exercises available today</Text>
            <Text style={[Typography.caption, { marginTop: 6, color: Colors.text.secondary }]}>
              The coach found nothing to program with your current setup. Add gear in the Kit tab, or
              loosen your Coach restrictions, then come back.
            </Text>
          </View>
        )}

        <Link href="/freestyle" asChild>
          <TouchableOpacity style={styles.freestyleLink}>
            <Text style={[Typography.caption, { color: Colors.text.secondary }]}>
              Not feeling it? → Freestyle
            </Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>

      {plan && plan.targets.length > 0 && (
        <View style={styles.startBar}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>Start Workout ({plan.targets.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 20, paddingBottom: 120 },
  greeting: { marginBottom: 4 },
  emphasisBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent.glow,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  emphasisText: {
    color: Colors.accent.primary,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resumeBanner: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.status.warning,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  prescription: {
    fontSize: 15,
    color: Colors.text.primary,
    marginTop: 4,
  },
  reason: {
    marginTop: 8,
    color: Colors.accent.primary,
  },
  swapBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.bg.elevated,
  },
  swapText: {
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  freestyleLink: {
    alignItems: 'center',
    paddingVertical: 18,
  },
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
