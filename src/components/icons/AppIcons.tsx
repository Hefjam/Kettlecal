import React, { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { IconTheme } from '../../theme/iconTheme';

export const APP_ICON_SOURCES = {
  'equipment.pullUpBar': require('../../../assets/icons/equipment/pull-up-bar.png'),
  'equipment.dipBars': require('../../../assets/icons/equipment/dip-bars.png'),
  'equipment.rings': require('../../../assets/icons/equipment/rings.png'),
  'equipment.bands': require('../../../assets/icons/equipment/resistance-bands.png'),
  'equipment.bodyweight': require('../../../assets/icons/equipment/bodyweight.png'),
  'kettlebell.generic': require('../../../assets/icons/kettlebells/kb-generic.png'),
  'kettlebell.12': require('../../../assets/icons/kettlebells/kb-12.png'),
  'kettlebell.16': require('../../../assets/icons/kettlebells/kb-16.png'),
  'kettlebell.20': require('../../../assets/icons/kettlebells/kb-20.png'),
  'kettlebell.24': require('../../../assets/icons/kettlebells/kb-24.png'),
  'quantity.1x': require('../../../assets/icons/kettlebells/qty-1x.png'),
  'quantity.2x': require('../../../assets/icons/kettlebells/qty-2x.png'),
  'action.startWorkout': require('../../../assets/icons/action/start-workout.png'),
  'action.swapExercise': require('../../../assets/icons/action/swap-exercise.png'),
  'action.add': require('../../../assets/icons/action/add.png'),
  'action.remove': require('../../../assets/icons/action/remove.png'),
  'action.complete': require('../../../assets/icons/action/complete.png'),
  'action.skillFocus': require('../../../assets/icons/action/skill-focus.png'),
  'nav.today': require('../../../assets/icons/nav/today.png'),
  'nav.history': require('../../../assets/icons/nav/history.png'),
  'nav.progress': require('../../../assets/icons/nav/progress.png'),
  'nav.coach': require('../../../assets/icons/nav/coach.png'),
  'nav.kit': require('../../../assets/icons/nav/kit.png'),
} as const satisfies Record<string, ImageSourcePropType>;

export type AppIconName = keyof typeof APP_ICON_SOURCES;
export type BottomNavIconName = 'today' | 'history' | 'progress' | 'coach' | 'kit';

interface AppIconProps {
  name: AppIconName;
  size?: number;
  active?: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppIcon({ name, size = IconTheme.sizes.action, active, muted, style }: AppIconProps) {
  const opacity = muted
    ? IconTheme.state.inactiveOpacity
    : active
      ? IconTheme.state.activeOpacity
      : IconTheme.state.activeOpacity;
  const webGlow =
    Platform.OS === 'web' && active
      ? ({ filter: `drop-shadow(0 0 ${Math.max(5, Math.round(size / 5))}px ${Colors.accent.primary})` } as any)
      : null;
  return (
    <View
      style={[
        { width: size, height: size },
        active && IconTheme.glow.active,
        style,
      ]}
    >
      <Image
        source={APP_ICON_SOURCES[name]}
        resizeMode="contain"
        style={[styles.iconImage, { width: size, height: size, opacity }, webGlow]}
      />
    </View>
  );
}

export function BottomNavIcon({ name, focused }: { name: BottomNavIconName; focused: boolean }) {
  return (
    <AppIcon
      name={`nav.${name}` as AppIconName}
      size={focused ? IconTheme.sizes.nav : IconTheme.sizes.nav - 4}
      active={focused}
      muted={!focused}
    />
  );
}

interface EquipmentCardProps {
  icon: AppIconName;
  label: string;
  active: boolean;
  onPress: () => void;
}

export function EquipmentCard({ icon, label, active, onPress }: EquipmentCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.card,
        active && styles.cardActive,
        hovered && styles.cardHover,
        pressed && styles.cardPressed,
      ]}
    >
      <AppIcon
        name={icon}
        size={IconTheme.sizes.equipment}
        active={active}
        muted={!active}
        style={styles.tileIcon}
      />
      <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>{label}</Text>
      <Text style={[styles.stateLabel, active ? styles.stateLabelActive : styles.stateLabelInactive]}>
        {active ? 'Selected' : 'Unselected'}
      </Text>
    </Pressable>
  );
}

function kettlebellIconName(weightKg: number): AppIconName {
  if (weightKg === 12) return 'kettlebell.12';
  if (weightKg === 16) return 'kettlebell.16';
  if (weightKg === 20) return 'kettlebell.20';
  if (weightKg === 24) return 'kettlebell.24';
  return 'kettlebell.generic';
}

function quantityIconName(quantity: number): AppIconName | null {
  if (quantity === 1) return 'quantity.1x';
  if (quantity === 2) return 'quantity.2x';
  return null;
}

export function KettlebellCard({
  weightKg,
  quantity,
  onRemove,
}: {
  weightKg: number;
  quantity: number;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const quantityIcon = quantityIconName(quantity);
  return (
    <View style={[styles.card, styles.kettlebellCard, hovered && styles.cardHover]}>
      <View style={styles.kettlebellIconFrame}>
        <AppIcon name={kettlebellIconName(weightKg)} size={IconTheme.sizes.kettlebell + 12} active />
        {quantityIcon ? (
          <AppIcon name={quantityIcon} size={IconTheme.sizes.badge + 4} active={quantity > 1} style={styles.quantityBadge} />
        ) : (
          <Text style={styles.quantityText}>{quantity}x</Text>
        )}
      </View>
      <Text style={styles.kettlebellLabel}>{weightKg}kg</Text>
      <Text style={styles.stateLabelActive}>Selected</Text>
      <Pressable
        onPress={onRemove}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        hitSlop={10}
        style={({ pressed }) => [styles.removeButton, pressed && styles.cardPressed]}
      >
        <AppIcon name="action.remove" size={22} active />
      </Pressable>
    </View>
  );
}

export function ActionButton({
  icon,
  label,
  onPress,
  variant = 'primary',
}: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'primary' && styles.actionButtonPrimary,
        variant === 'secondary' && styles.actionButtonSecondary,
        variant === 'danger' && styles.actionButtonDanger,
        hovered && styles.actionButtonHover,
        pressed && styles.cardPressed,
      ]}
    >
      <AppIcon name={icon} size={IconTheme.sizes.action} active={variant !== 'secondary'} muted={variant === 'secondary'} />
      <Text style={[styles.actionLabel, variant === 'primary' && styles.actionLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconImage: {
    display: 'flex',
  },
  card: {
    width: '48%',
    minHeight: 158,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cardActive: {
    borderColor: Colors.accent.primary,
    backgroundColor: Colors.bg.elevated,
  },
  cardHover: {
    borderColor: Colors.accent.teal,
  },
  cardPressed: {
    opacity: IconTheme.state.pressedOpacity,
    transform: [{ scale: 0.99 }],
  },
  tileIcon: {
    marginBottom: 10,
  },
  cardLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.accent.primary,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  cardLabelActive: {
    color: Colors.accent.teal,
  },
  stateLabel: {
    fontFamily: 'VT323_400Regular',
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  stateLabelActive: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.teal,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  stateLabelInactive: {
    color: Colors.text.muted,
  },
  kettlebellCard: {
    width: '48%',
    minHeight: 190,
    position: 'relative',
  },
  kettlebellLabel: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.accent.acid,
    fontSize: 17,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 8,
  },
  kettlebellIconFrame: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1.5,
    borderColor: Colors.accent.primary,
    borderRadius: 8,
    ...IconTheme.glow.subtle,
  },
  quantityBadge: {
    position: 'absolute',
    right: -10,
    bottom: -8,
  },
  quantityText: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    minWidth: 34,
    fontFamily: 'Bungee_400Regular',
    color: Colors.accent.teal,
    fontSize: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg.elevated,
  },
  actionButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.accent.primary,
    borderColor: Colors.accent.primary,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.bg.card,
    borderColor: Colors.accent.teal,
  },
  actionButtonDanger: {
    backgroundColor: Colors.bg.card,
    borderColor: Colors.status.error,
  },
  actionButtonHover: {
    borderColor: Colors.accent.acid,
  },
  actionLabel: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.accent.teal,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  actionLabelPrimary: {
    color: Colors.text.inverse,
  },
});
