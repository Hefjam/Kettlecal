import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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

export default function CoachScreen() {
  const { profile, setSessionLength, toggleRestrictedExercise, setAutoAdjustEnabled } =
    useCoachProfile();
  const clearPlan = useTodayPlan((s) => s.clear);

  const updateLength = (length: SessionLength) => {
    setSessionLength(length);
    clearPlan();
  };
  const updateRestriction = (exerciseId: string) => {
    toggleRestrictedExercise(exerciseId);
    clearPlan();
  };
  const updateAutoAdjust = () => {
    setAutoAdjustEnabled(!profile.autoAdjust.enabled);
    clearPlan();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={[Typography.h2, { marginBottom: 4 }]}>Coach</Text>
      <Text style={[Typography.caption, { marginBottom: 20 }]}>
        Calisthenics primary, kettlebells supporting.
      </Text>

      <View style={styles.section}>
        <Text style={[Typography.label, { marginBottom: 10 }]}>Routine</Text>
        <View style={styles.modeCard}>
          <Text style={Typography.body}>Calisthenics + KB support</Text>
          <Text style={[Typography.caption, { marginTop: 4 }]}>
            Pull, push, rows, hinges, core, conditioning.
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
              >
                <Text style={[styles.lengthLabel, active && styles.activeText]}>
                  {length.label}
                </Text>
                <Text style={[styles.lengthDetail, active && styles.activeText]}>
                  {length.detail}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[Typography.label, { marginBottom: 10 }]}>Avoid Auto-Pick</Text>
        {PRESS_FAMILY.map((id) => {
          const exercise = EXERCISES.find((e) => e.id === id);
          const active = profile.restrictedAutoPickExerciseIds.includes(id);
          return (
            <TouchableOpacity
              key={id}
              style={[styles.toggleRow, active && styles.toggleRowActive]}
              onPress={() => updateRestriction(id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={Typography.body}>{exercise?.name ?? id}</Text>
                <Text style={[Typography.caption, { marginTop: 2 }]}>Freestyle still allows it</Text>
              </View>
              <View style={[styles.toggle, active && styles.toggleOn]}>
                <Text style={styles.toggleText}>{active ? 'Off' : 'On'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={[Typography.label, { marginBottom: 10 }]}>Auto-Adjust</Text>
        <TouchableOpacity
          style={[styles.toggleRow, profile.autoAdjust.enabled && styles.toggleRowActive]}
          onPress={updateAutoAdjust}
        >
          <View style={{ flex: 1 }}>
            <Text style={Typography.body}>Adapt to pain + RPE</Text>
            <Text style={[Typography.caption, { marginTop: 2 }]}>
              Off by default. When on, pain 4+ downranks, pain 6+ avoids patterns, RPE 9+ holds.
            </Text>
            <Text style={[Typography.caption, styles.disclaimer]}>
              Self-tracking, not medical advice. Pain that persists — see a clinician.
            </Text>
          </View>
          <View style={[styles.toggle, profile.autoAdjust.enabled && styles.toggleOn]}>
            <Text style={styles.toggleText}>{profile.autoAdjust.enabled ? 'On' : 'Off'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 20, paddingBottom: 40 },
  section: {
    marginBottom: 24,
  },
  modeCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  lengthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lengthBtn: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
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
    textAlign: 'center',
    marginTop: 3,
  },
  activeText: {
    color: Colors.accent.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toggleRowActive: {
    borderColor: Colors.accent.primary,
  },
  toggle: {
    minWidth: 42,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 12,
  },
  toggleOn: { backgroundColor: Colors.accent.primary },
  toggleText: { color: Colors.text.primary, fontWeight: '800', fontSize: 12 },
  disclaimer: { marginTop: 4, color: Colors.text.secondary, fontStyle: 'italic' },
});
