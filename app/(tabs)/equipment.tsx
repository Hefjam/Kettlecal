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
import { EquipmentItem, KettlebellWeight } from '../../src/types';

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

  const handleAddKb = () => {
    const weight = parseFloat(newKbWeight);
    const qty = parseInt(newKbQty, 10);
    if (!weight || weight <= 0) {
      Alert.alert('Invalid weight');
      return;
    }
    addKettlebell({ weightKg: weight, quantity: qty });
    setNewKbWeight('');
    setNewKbQty('1');
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

      {/* Add kettlebell */}
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
        <TouchableOpacity style={styles.addBtn} onPress={handleAddKb}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
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
});
