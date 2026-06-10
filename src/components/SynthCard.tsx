import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { Colors } from '../theme/colors';

interface SynthCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'kb' | 'cal' | 'default';
}

// "Curved Tube" CRT glass card — fishbowl look from the Hotline Miami design.
// On web: radial gradient + chromatic inset shadow via inline CSS.
// On native: approximated with borderRadius + shadow glow.
export function SynthCard({ children, style, variant = 'default' }: SynthCardProps) {
  const fringe = variant === 'cal' ? Colors.accent.teal : Colors.accent.primary;
  const fringeHex = variant === 'cal' ? '#19e0c8' : '#ff2e88';

  const webStyle: ViewStyle = Platform.OS === 'web' ? ({
    background: 'radial-gradient(120% 105% at 50% 38%, #27143f, #0c0520 92%)',
    boxShadow: `0 14px 30px rgba(0,0,0,.55), inset 0 0 0 2px ${fringeHex}2e, inset 0 0 70px rgba(0,0,0,.65), inset 3px 0 7px ${fringeHex}4d, inset -3px 0 7px ${fringeHex === '#ff2e88' ? '#19e0c8' : '#ff2e88'}4d`,
  } as any) : {};

  return (
    <View
      style={[
        styles.card,
        { shadowColor: fringe, borderColor: fringe + '30' },
        webStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 30,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    // Native shadow glow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
});
