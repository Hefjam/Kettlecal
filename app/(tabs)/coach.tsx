import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
import { SessionLength } from '../../src/types';

const LENGTHS: { id: SessionLength; label: string; detail: string }[] = [
  { id: 'short', label: 'Short', detail: '4 slots' },
  { id: 'standard', label: 'Standard', detail: '5 slots' },
  { id: 'long', label: 'Long', detail: '6 slots' },
];

const PRESS_FAMILY = [
  'kb-press',
  'kb-double-press',
  'kb-clean-press',
  'kb-double-clean-press',
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[Typography.h2, styles.title]}>Coach Settings</Text>
      <Text style={[Typography.caption, styles.subtitle]}>
        Calisthenics primary, kettlebells supporting.
      </Text>

      <View style={styles.section}>
        <Text style={[Typography.label, styles.sectionLabel]}>Routine Mode</Text>
        <View style={styles.modeCard}>
          <Text style={[Typography.body, { fontWeight: '700' }]}>Calisthenics + KB support</Text>
          <Text style={[Typography.caption, { marginTop: 4, color: Colors.text.secondary }]}>
            Optimized rotation covering vertical/horizontal pulls, push variations, hinges, core, and kettlebell conditioning.
          </Text>
        </View>
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
                <Text style={[styles.lengthLabel, active && styles.activeText]}>
                  {length.label}
                </Text>
                <Text style={[styles.lengthDetail, active && styles.activeTextDetail]}>
                  {length.detail}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[Typography.label, styles.sectionLabel]}>Avoid Auto-Pick</Text>
        <Text style={[Typography.caption, { marginBottom: 10, marginTop: -4 }]}>
          Toggle exercises you do not want the coach to automatically program for you.
        </Text>
        {PRESS_FAMILY.map((id) => {
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
        <Text style={[Typography.label, styles.sectionLabel]}>Auto-Adjust Engine</Text>
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
            <Text style={[Typography.caption, styles.disclaimer]}>
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
  title: { marginBottom: 4 },
  subtitle: { marginBottom: 24 },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  modeCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lengthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lengthBtn: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 52, // Touch target safety
  },
  lengthBtnActive: {
    backgroundColor: Colors.accent.glow,
    borderColor: Colors.accent.primary,
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
  activeText: {
    color: Colors.accent.primary,
  },
  activeTextDetail: {
    color: Colors.accent.primary,
    opacity: 0.8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  toggleRowActive: {
    borderColor: Colors.border, // keep clean borders
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
    lineHeight: 14,
  },
});
