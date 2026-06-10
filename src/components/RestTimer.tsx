import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface RestTimerProps {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimer({ seconds, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgOpacity = useSharedValue(0.1);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: Colors.bg.card,
    borderColor: `rgba(255, 94, 58, ${bgOpacity.value * 3.5})`,
    borderWidth: 1.5,
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: bgOpacity.value,
    shadowRadius: 10,
    elevation: 3,
  }));

  const pulse = useCallback(() => {
    bgOpacity.value = withSequence(
      withTiming(0.35, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0.1, { duration: 600 })
    );
  }, [bgOpacity]);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onComplete();
          return 0;
        }
        // Pulse on each tick in the last 10 seconds (warning phase)
        if (r <= 11) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          pulse();
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onComplete, pulse]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = minutes > 0
    ? `${minutes}:${String(secs).padStart(2, '0')}`
    : `${secs}`;

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <Text style={styles.restLabel}>REST TIMER</Text>
      <Text style={[Typography.monoLarge, styles.timerVal]}>{display}</Text>
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onSkip();
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.skipBtnText}>Skip Rest</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  restLabel: {
    color: Colors.accent.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  timerVal: {
    color: Colors.text.primary,
    marginVertical: 8,
    fontSize: 64,
  },
  skipBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 44, // Touch target safety
    justifyContent: 'center',
  },
  skipBtnText: {
    color: Colors.text.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
});
