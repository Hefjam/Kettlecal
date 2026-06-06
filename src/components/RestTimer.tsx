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
  const bgOpacity = useSharedValue(0.4);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255, 69, 0, ${bgOpacity.value})`,
  }));

  const pulse = useCallback(() => {
    bgOpacity.value = withSequence(
      withTiming(0.8, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(0.4, { duration: 400 })
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
        if (r === 11) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      <Text style={[Typography.label, { color: Colors.text.secondary }]}>REST</Text>
      <Text style={[Typography.monoLarge, { marginVertical: 4 }]}>{display}</Text>
      <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
        <Text style={[Typography.body, { color: Colors.text.secondary }]}>Skip</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginVertical: 8,
  },
  skipBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 8,
  },
});
