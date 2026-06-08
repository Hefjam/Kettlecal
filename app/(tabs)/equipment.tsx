import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { useEquipment } from '../../src/stores/useEquipment';
import { useWorkoutHistory } from '../../src/stores/useWorkoutHistory';
import { useRotation } from '../../src/stores/useRotation';
import { useCoachProfile } from '../../src/stores/useCoachProfile';
import { useTodayPlan } from '../../src/stores/useTodayPlan';
import { exportBackup, importBackup, StoreRegistry } from '../../src/data/backup';
import { EquipmentItem, KettlebellWeight } from '../../src/types';

/**
 * Wires the three persisted zustand stores into the registry backup.ts expects.
 * Lives here (not in backup.ts) so backup.ts stays free of native MMKV imports
 * and remains unit-testable in plain Node.
 */
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

export default function EquipmentScreen() {
  const { equipment, toggleItem, addKettlebell, removeKettlebell } = useEquipment();
  const [newKbWeight, setNewKbWeight] = useState('');
  const [newKbQty, setNewKbQty] = useState('1');
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');

  const handleAddKb = () => {
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

  const handleExport = () => {
    const json = JSON.stringify(exportBackup(liveStores()), null, 2);
    setExportText(json);
  };

  const handleImport = () => {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={[Typography.h2, { marginBottom: 4 }]}>My Equipment</Text>
      <Text style={[Typography.caption, { marginBottom: 20 }]}>
        Exercises are filtered to match what you have available.
      </Text>

      {/* Static equipment */}
      <Text style={[Typography.label, { marginBottom: 10 }]}>Training Gear</Text>
      {equipmentItems.map((item) => {
        const active = equipment.items.includes(item);
        return (
          <TouchableOpacity
            key={item}
            style={[styles.itemRow, active && styles.itemRowActive]}
            onPress={() => toggleItem(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>{EQUIPMENT_ICONS[item]}</Text>
            <Text style={[Typography.body, { flex: 1 }]}>{EQUIPMENT_LABELS[item]}</Text>
            <View style={[styles.toggle, active && styles.toggleOn]}>
              <Text style={styles.toggleText}>{active ? '✓' : '+'}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Kettlebells */}
      <Text style={[Typography.label, { marginTop: 24, marginBottom: 10 }]}>Kettlebells</Text>
      {equipment.kettlebells.map((kb) => (
        <View key={kb.weightKg} style={styles.kbRow}>
          <Text style={styles.itemIcon}>🔔</Text>
          <Text style={[Typography.body, { flex: 1 }]}>
            {kb.quantity}× {kb.weightKg}kg
          </Text>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeKettlebell(kb.weightKg)}
          >
            <Text style={{ color: Colors.status.error, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Add kettlebell — inputs on one row, full-width Add button below so the
          button can't be pushed off-screen on narrow phone widths. */}
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
      <TouchableOpacity style={[styles.addBtn, { marginTop: 8 }]} onPress={handleAddKb}>
        <Text style={styles.addBtnText}>Add kettlebell</Text>
      </TouchableOpacity>

      {/* Backup */}
      <Text style={[Typography.label, { marginTop: 32, marginBottom: 6 }]}>Backup</Text>
      <Text style={[Typography.caption, { marginBottom: 12 }]}>
        Your history and coach profile live only on this phone. Export to save a copy; import to restore it.
      </Text>

      <TouchableOpacity style={styles.backupBtn} onPress={handleExport} activeOpacity={0.7}>
        <Text style={styles.backupBtnText}>Export backup</Text>
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
        style={[styles.backupBox, { marginTop: 12 }]}
        value={importText}
        onChangeText={setImportText}
        multiline
        placeholder="Paste a backup here to restore"
        placeholderTextColor={Colors.text.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={[styles.backupBtn, { marginTop: 8 }]}
        onPress={handleImport}
        activeOpacity={0.7}
      >
        <Text style={styles.backupBtnText}>Import backup</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: 20 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemRowActive: {
    borderColor: Colors.accent.primary,
  },
  itemIcon: { fontSize: 22, marginRight: 12 },
  toggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: Colors.accent.primary },
  toggleText: { color: Colors.text.primary, fontWeight: '700', fontSize: 13 },
  kbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  removeBtn: { padding: 4 },
  addKbRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  kbInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: Colors.text.primary,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: Colors.text.primary, fontWeight: '700' },
  backupBtn: {
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent.primary,
  },
  backupBtnText: { color: Colors.text.primary, fontWeight: '700' },
  backupBox: {
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    marginTop: 8,
    padding: 12,
    minHeight: 90,
    color: Colors.text.primary,
    fontSize: 12,
    textAlignVertical: 'top',
  },
});
