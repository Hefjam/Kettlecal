import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { EXERCISES } from '../../src/data/exercises';
import { useCoachProfile } from '../../src/stores/useCoachProfile';
import { useTodayPlan } from '../../src/stores/useTodayPlan';
import { SynthCard } from '../../src/components/SynthCard';
import { SessionLength } from '../../src/types';

const LENGTHS: { id: SessionLength; label: string; detail: string }[] = [
  { id: 'short', label: 'Short', detail: '4 slots' },
  { id: 'standard', label: 'Standard', detail: '5 slots' },
  { id: 'long', label: 'Long', detail: '6 slots' },
];

// All overhead KB work is restricted from auto-pick by default (shoulder-
// protective; decision 2026-06-10) — grinding presses AND ballistic/loaded
// overhead. Each is individually toggleable here.
const OVERHEAD_FAMILY = [
  'kb-press',
  'kb-double-press',
  'kb-clean-press',
  'kb-double-clean-press',
  'kb-snatch',
  'kb-turkish-getup',
  'kb-windmill',
];

function CustomSwitch({ active }: { active: boolean }) {
  const knobTranslate = useSharedValue(active ? 18 : 2);

  useEffect(() => {
    knobTranslate.value = withTiming(active ? 18 : 2, { duration: 180 });
  }, [active, knobTranslate]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobTranslate.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(active ? Colors.accent.primary : Colors.bg.elevated, { duration: 180 }),
    borderColor: withTiming(active ? Colors.accent.primary : Colors.border, { duration: 180 }),
  }));

  return (
    <Animated.View style={[styles.switchTrack, trackStyle]}>
      <Animated.View style={[styles.switchKnob, knobStyle]} />
    </Animated.View>
  );
}

const webBg = Platform.OS === 'web' ? {
  backgroundImage: `repeating-linear-gradient(45deg, rgba(123,47,247,.10) 0 22px, transparent 22px 44px), repeating-linear-gradient(-45deg, rgba(255,46,136,.07) 0 22px, transparent 22px 44px)`,
} as any : {};

export default function CoachScreen() {
  const { profile, setSessionLength, toggleRestrictedExercise, setAutoAdjustEnabled } =
    useCoachProfile();
  const clearPlan = useTodayPlan((s) => s.clear);

  const updateLength = (length: SessionLength) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSessionLength(length);
    clearPlan();
  };

  const updateRestriction = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleRestrictedExercise(exerciseId);
    clearPlan();
  };

  const updateAutoAdjust = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAutoAdjustEnabled(!profile.autoAdjust.enabled);
    clearPlan();
  };

  return (
    <ScrollView style={[styles.container, webBg]} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Coach Settings</Text>
      <Text style={[Typography.caption, styles.subtitle]}>
        Calisthenics primary, kettlebells supporting.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Routine Mode</Text>
        <SynthCard style={styles.modeCard}>
          <Text style={[Typography.body, { fontWeight: '700' }]}>Calisthenics + KB support</Text>
          <Text style={[Typography.caption, { marginTop: 4, color: Colors.text.secondary }]}>
            Optimized rotation covering vertical/horizontal pulls, push variations, hinges, core, and kettlebell conditioning.
          </Text>
        </SynthCard>
        <View style={styles.lengthRow}>
          {LENGTHS.map((length) => {
            const active = profile.sessionLength === length.id;
            return (
              <TouchableOpacity
                key={length.id}
                style={[styles.lengthBtn, active && styles.lengthBtnActive]}
                onPress={() => updateLength(length.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.lengthLabel, active && styles.activeLengthLabel]}>
                  {length.label}
                </Text>
                <Text style={[styles.lengthDetail, active && styles.activeLengthDetail]}>
                  {length.detail}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Avoid Auto-Pick</Text>
        <Text style={[Typography.caption, { marginBottom: 10, marginTop: -4, color: Colors.text.secondary }]}>
          Toggle exercises you do not want the coach to automatically program for you.
        </Text>
        {OVERHEAD_FAMILY.map((id) => {
          const exercise = EXERCISES.find((e) => e.id === id);
          const active = profile.restrictedAutoPickExerciseIds.includes(id);
          return (
            <TouchableOpacity
              key={id}
              style={[styles.toggleRow, active && styles.toggleRowActive]}
              onPress={() => updateRestriction(id)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={Typography.body}>{exercise?.name ?? id}</Text>
                <Text style={[Typography.caption, { marginTop: 2, color: Colors.text.muted }]}>
                  Freestyle mode still allows selection
                </Text>
              </View>
              <CustomSwitch active={!active} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Auto-Adjust Engine</Text>
        <TouchableOpacity
          style={[styles.toggleRow, profile.autoAdjust.enabled && styles.toggleRowActive]}
          onPress={updateAutoAdjust}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={Typography.body}>Adapt plans to pain + RPE</Text>
            <Text style={[Typography.caption, { marginTop: 4, color: Colors.text.secondary }]}>
              When enabled, the coach adapts: pain 4+ downranks next targets, pain 6+ avoids matching muscle patterns, and RPE 9+ holds progressions.
            </Text>
            <Text style={styles.disclaimer}>
              ⚠️ Self-tracking, not medical advice. Persistent pain should be evaluated by a healthcare professional.
            </Text>
          </View>
          <CustomSwitch active={profile.autoAdjust.enabled} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 20, paddingBottom: 40 },
  title: {
    fontFamily: 'Bungee_400Regular',
    textTransform: 'uppercase',
    color: Colors.text.primary,
    fontSize: 26,
    marginBottom: 4,
  },
  subtitle: { marginBottom: 24, color: Colors.text.secondary },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.accent.teal,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 13,
    marginBottom: 12,
  },
  modeCard: {
    marginBottom: 12,
  },
  lengthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lengthBtn: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: 4,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 52,
  },
  lengthBtnActive: {
    backgroundColor: 'rgba(255,46,136,0.15)',
    borderColor: Colors.accent.primary,
    borderRadius: 4,
  },
  lengthLabel: {
    color: Colors.text.primary,
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  lengthDetail: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 3,
  },
  activeLengthLabel: {
    color: Colors.accent.acid,
  },
  activeLengthDetail: {
    color: Colors.accent.teal,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  toggleRowActive: {
    borderColor: Colors.accent.teal,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.text.primary,
  },
  disclaimer: {
    marginTop: 10,
    color: Colors.text.muted,
    fontStyle: 'italic',
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
    lineHeight: 18,
  },
});
