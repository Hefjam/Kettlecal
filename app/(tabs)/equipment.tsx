import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { useEquipment } from '../../src/stores/useEquipment';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { useRotation } from '../../src/stores/useRotation';
import { useCoachProfile } from '../../src/stores/useCoachProfile';
import { useTodayPlan } from '../../src/stores/useTodayPlan';
import { exportBackup, importBackup, StoreRegistry } from '../../src/data/backup';
import { EquipmentItem, KettlebellWeight } from '../../src/types';

function liveStores(): StoreRegistry {
  return {
    equipment: {
      get: () => ({ equipment: useEquipment.getState().equipment }),
      set: (s) => useEquipment.setState({ equipment: s.equipment }),
    },
    'workout-history': {
      get: () => ({ sessions: useWorkoutHistory.getState().sessions }),
      set: (s) => useWorkoutHistory.setState({ sessions: s.sessions }),
    },
    rotation: {
      get: () => ({
        lastEmphasis: useRotation.getState().lastEmphasis,
        sessionCount: useRotation.getState().sessionCount,
      }),
      set: (s) =>
        useRotation.setState({ lastEmphasis: s.lastEmphasis, sessionCount: s.sessionCount }),
    },
    'coach-profile': {
      get: () => ({ profile: useCoachProfile.getState().profile }),
      set: (s) => useCoachProfile.setState({ profile: s.profile }),
    },
  };
}

const EQUIPMENT_LABELS: Record<EquipmentItem, string> = {
  'pull-up-bar': 'Pull-Up Bar',
  'dip-bars': 'Dip Bars',
  'gymnastics-rings': 'Gymnastics Rings',
  bands: 'Resistance Bands',
  'kettlebell-20kg': 'Kettlebell (20kg)',
  'kettlebell-24kg': 'Kettlebell (24kg)',
  bodyweight: 'Bodyweight',
};

const EQUIPMENT_ICONS: Record<EquipmentItem, string> = {
  'pull-up-bar': '🏗️',
  'dip-bars': '🔧',
  'gymnastics-rings': '⭕',
  bands: '🔴',
  'kettlebell-20kg': '⚫',
  'kettlebell-24kg': '⚫',
  bodyweight: '🧍',
};

function CustomSwitch({ active }: { active: boolean }) {
  return (
    <View style={[styles.switchTrack, {
      backgroundColor: active ? Colors.accent.primary : Colors.bg.elevated,
      borderColor: active ? Colors.accent.primary : Colors.border,
    }]}>
      <View style={[styles.switchKnob, {
        transform: [{ translateX: active ? 18 : 2 }],
      }]} />
    </View>
  );
}

const webBg = Platform.OS === 'web' ? {
  backgroundImage: `repeating-linear-gradient(45deg, rgba(123,47,247,.10) 0 22px, transparent 22px 44px), repeating-linear-gradient(-45deg, rgba(255,46,136,.07) 0 22px, transparent 22px 44px)`,
} as any : {};

export default function EquipmentScreen() {
  const { equipment, toggleItem, addKettlebell, removeKettlebell } = useEquipment();
  const [newKbWeight, setNewKbWeight] = useState('');
  const [newKbQty, setNewKbQty] = useState('1');
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');

  const handleToggle = (item: EquipmentItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleItem(item);
  };

  const handleAddKb = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const weight = parseFloat(newKbWeight);
    const qty = parseInt(newKbQty, 10);
    if (!weight || weight <= 0) {
      Alert.alert('Invalid weight');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Invalid quantity');
      return;
    }
    addKettlebell({ weightKg: weight, quantity: qty });
    setNewKbWeight('');
    setNewKbQty('1');
  };

  const handleRemoveKb = (weight: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeKettlebell(weight);
  };

  const handleExport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const json = JSON.stringify(exportBackup(liveStores()), null, 2);
    setExportText(json);
  };

  const handleImport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = importText.trim();
    if (!text) {
      Alert.alert('Paste a backup first');
      return;
    }
    Alert.alert(
      'Restore backup?',
      'This replaces your current equipment, workout history, rotation, and coach profile with the pasted backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            try {
              importBackup(text, liveStores());
              useTodayPlan.getState().clear();
              setImportText('');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Backup restored');
            } catch (e) {
              Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
            }
          },
        },
      ]
    );
  };

  const equipmentItems: EquipmentItem[] = [
    'pull-up-bar',
    'dip-bars',
    'gymnastics-rings',
    'bands',
    'bodyweight',
  ];

  return (
    <ScrollView style={[styles.container, webBg]} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>My Equipment</Text>
      <Text style={[Typography.caption, styles.subtitle]}>
        Exercises are filtered to match what you have available.
      </Text>

      {/* Static equipment */}
      <Text style={styles.sectionLabel}>Training Gear</Text>
      {equipmentItems.map((item) => {
        const active = equipment.items.includes(item);
        return (
          <TouchableOpacity
            key={item}
            style={[styles.itemRow, active && styles.itemRowActive]}
            onPress={() => handleToggle(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.itemIcon}>{EQUIPMENT_ICONS[item]}</Text>
            <Text style={[Typography.body, { flex: 1, fontWeight: '700' }]}>{EQUIPMENT_LABELS[item]}</Text>
            <CustomSwitch active={active} />
          </TouchableOpacity>
        );
      })}

      {/* Kettlebells */}
      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Kettlebells</Text>
      {equipment.kettlebells.length === 0 ? (
        <Text style={[Typography.caption, { color: Colors.text.muted, marginBottom: 12 }]}>
          No kettlebells added yet. Add your kettlebells below.
        </Text>
      ) : (
        equipment.kettlebells.map((kb) => (
          <View key={kb.weightKg} style={styles.kbRow}>
            <Text style={styles.itemIcon}>🔔</Text>
            <Text style={[Typography.body, { flex: 1, fontWeight: '700' }]}>
              <Text style={{ fontFamily: 'VT323_400Regular', fontSize: 18, color: Colors.accent.acid }}>
                {kb.quantity}× {kb.weightKg}kg
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveKb(kb.weightKg)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Add kettlebell */}
      <View style={styles.addKbBox}>
        <Text style={styles.addKbLabel}>
          Add Kettlebell Inventory
        </Text>
        <View style={styles.addKbRow}>
          <TextInput
            style={[styles.kbInput, { flex: 2 }]}
            value={newKbWeight}
            onChangeText={setNewKbWeight}
            keyboardType="decimal-pad"
            placeholder="Weight (kg)"
            placeholderTextColor={Colors.text.muted}
          />
          <TextInput
            style={[styles.kbInput, { flex: 1 }]}
            value={newKbQty}
            onChangeText={setNewKbQty}
            keyboardType="number-pad"
            placeholder="Qty"
            placeholderTextColor={Colors.text.muted}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddKb} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>Add Kettlebell</Text>
        </TouchableOpacity>
      </View>

      {/* Backup */}
      <Text style={[styles.sectionLabel, { marginTop: 32 }]}>Backup &amp; Restore</Text>
      <Text style={[Typography.caption, { marginBottom: 14, color: Colors.text.secondary }]}>
        Your training history lives only on this device. Save a text backup to protect your data.
      </Text>

      <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.8}>
        <Text style={styles.exportBtnText}>Export Backup JSON</Text>
      </TouchableOpacity>

      {exportText !== '' && (
        <TextInput
          style={styles.backupBox}
          value={exportText}
          multiline
          editable={false}
          selectTextOnFocus
        />
      )}

      <TextInput
        style={[styles.backupBox, { marginTop: 14 }]}
        value={importText}
        onChangeText={setImportText}
        multiline
        placeholder="Paste JSON backup text here to restore..."
        placeholderTextColor={Colors.text.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={[styles.importBtn, { marginTop: 10 }]}
        onPress={handleImport}
        activeOpacity={0.8}
      >
        <Text style={styles.importBtnText}>Import Backup JSON</Text>
      </TouchableOpacity>
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
  sectionLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.accent.teal,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 13,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  itemRowActive: {
    borderColor: Colors.accent.primary,
  },
  itemIcon: { fontSize: 22, marginRight: 12 },
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
  kbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  removeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,46,136,0.10)',
    borderRadius: 8,
    minHeight: 32,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: Colors.status.error,
    fontSize: 14,
    fontWeight: '800',
  },
  addKbBox: {
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  addKbLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.accent.teal,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 8,
  },
  addKbRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  kbInput: {
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 4,
    height: 48,
    paddingHorizontal: 12,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 13,
  },
  exportBtn: {
    backgroundColor: Colors.bg.card,
    borderRadius: 4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accent.teal,
  },
  exportBtnText: {
    color: Colors.accent.teal,
    fontWeight: '800',
    fontSize: 14,
  },
  importBtn: {
    backgroundColor: Colors.bg.card,
    borderRadius: 4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.status.error,
  },
  importBtnText: {
    color: Colors.status.error,
    fontWeight: '800',
    fontSize: 14,
  },
  backupBox: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 10,
    padding: 14,
    minHeight: 110,
    color: Colors.text.primary,
    fontSize: 14,
    fontFamily: 'VT323_400Regular',
    textAlignVertical: 'top',
  },
});
