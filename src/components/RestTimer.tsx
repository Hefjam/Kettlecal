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

interface RestTimerProps {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimer({ seconds, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  // JS timers pause while the app is backgrounded/locked, so remaining time is
  // derived from a wall-clock deadline rather than counting interval ticks.
  const endsAtRef = useRef(Date.now() + seconds * 1000);
  const lastShownRef = useRef(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgOpacity = useSharedValue(0.1);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: Colors.bg.secondary,
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
    endsAtRef.current = Date.now() + seconds * 1000;
    lastShownRef.current = seconds;
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const r = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      if (r !== lastShownRef.current) {
        lastShownRef.current = r;
        // Pulse on each displayed second in the last 10 seconds (warning phase)
        if (r > 0 && r <= 10) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          pulse();
        }
        setRemaining(r);
      }
      if (r <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
      }
    }, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [seconds, onComplete, pulse]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = minutes > 0
    ? `${minutes}:${String(secs).padStart(2, '0')}`
    : `${secs}`;

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <Text style={styles.restLabel}>REST</Text>
      <Text style={styles.timerVal}>{display}</Text>
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
    fontFamily: 'Anton_400Regular',
    color: Colors.text.secondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  timerVal: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    fontSize: 96,
    marginVertical: 4,
  },
  skipBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44, // Touch target safety
    justifyContent: 'center',
  },
  skipBtnText: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.secondary,
    fontSize: 20,
  },
});
