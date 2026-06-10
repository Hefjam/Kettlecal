import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';

interface EmomTimerProps {
  visible: boolean;
  onClose: () => void;
}

const MAX_MINUTES = 30;
const MINUTE_MS = 60_000;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function EmomTimer({ visible, onClose }: EmomTimerProps) {
  const [totalMinutes, setTotalMinutes] = useState(10);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  // JS timers pause while the app is backgrounded/locked, so elapsed time is
  // derived from wall-clock anchors rather than counting interval ticks.
  const anchorRef = useRef({ accumulatedMs: 0, startedAt: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastMinuteFiredRef = useRef(0);

  const bellScale = useSharedValue(1);
  const bellStyle = useAnimatedStyle(() => ({ transform: [{ scale: bellScale.value }] }));

  const totalMs = totalMinutes * MINUTE_MS;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const currentMinute = Math.floor(elapsedMs / MINUTE_MS);
  const secondsIntoMinute = Math.floor((elapsedMs % MINUTE_MS) / 1000);
  const secondsLeftInMinute = 60 - secondsIntoMinute;

  const ringBell = useCallback(async () => {
    bellScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 300 }),
      withTiming(1, { duration: 400 })
    );
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
    }
  }, [bellScale]);

  useEffect(() => {
    let sound: Audio.Sound | null = null;
    Audio.Sound.createAsync(
      // Place a bell.wav in assets/sounds/. Falls back gracefully if missing.
      require('../../assets/sounds/bell.wav'),
      { shouldPlay: false, volume: 1.0 }
    )
      .then(({ sound: s }) => {
        sound = s;
        soundRef.current = s;
      })
      .catch(() => {
        // Sound file not present — haptics-only mode
      });
    return () => {
      sound?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      const next = Math.min(
        totalMs,
        anchorRef.current.accumulatedMs + Date.now() - anchorRef.current.startedAt
      );
      const minuteJustCompleted = Math.floor(next / MINUTE_MS);
      if (minuteJustCompleted > lastMinuteFiredRef.current && next < totalMs) {
        // Rings once even if several boundaries passed while backgrounded
        lastMinuteFiredRef.current = minuteJustCompleted;
        ringBell();
      }
      if (next >= totalMs) {
        anchorRef.current.accumulatedMs = totalMs;
        setRunning(false);
        ringBell();
      }
      setElapsedMs(next);
    }, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, totalMs, ringBell]);

  const handleStartPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (elapsedMs >= totalMs) {
      anchorRef.current = { accumulatedMs: 0, startedAt: Date.now() };
      lastMinuteFiredRef.current = 0;
      setElapsedMs(0);
      setRunning(true);
    } else if (running) {
      anchorRef.current.accumulatedMs += Date.now() - anchorRef.current.startedAt;
      setElapsedMs(anchorRef.current.accumulatedMs);
      setRunning(false);
    } else {
      anchorRef.current.startedAt = Date.now();
      lastMinuteFiredRef.current = Math.floor(elapsedMs / MINUTE_MS);
      setRunning(true);
    }
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(false);
    anchorRef.current = { accumulatedMs: 0, startedAt: 0 };
    setElapsedMs(0);
    lastMinuteFiredRef.current = 0;
  };

  const adjustDuration = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTotalMinutes((m) => Math.min(MAX_MINUTES, Math.max(1, m + amount)));
  };

  const formatRemaining = () => {
    const m = Math.floor(remainingMs / MINUTE_MS);
    const s = Math.floor((remainingMs % MINUTE_MS) / 1000);
    return `${pad(m)}:${pad(s)}`;
  };

  const progressFraction = totalMs > 0 ? elapsedMs / totalMs : 0;
  const isDone = elapsedMs >= totalMs;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.emomHeader}>EMOM TIMER</Text>

        {/* Bell + minute indicator */}
        <Animated.View style={[styles.bellRow, bellStyle]}>
          <Text style={styles.bellEmoji}>🔔</Text>
          {running && !isDone && (
            <Text style={styles.minuteIndicator}>
              min {currentMinute + 1} · next in {secondsLeftInMinute}s
            </Text>
          )}
        </Animated.View>

        {/* Main countdown */}
        <Text style={styles.countdown}>
          {formatRemaining()}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressFraction * 100}%` as any }]} />
        </View>

        {/* Duration picker */}
        {!running && elapsedMs === 0 && (
          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>Duration</Text>
            <View style={styles.durationControls}>
              <TouchableOpacity
                style={styles.durationBtn}
                onPress={() => adjustDuration(-1)}
                activeOpacity={0.7}
              >
                <Text style={styles.durationBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.durationValue}>{totalMinutes} min</Text>
              <TouchableOpacity
                style={styles.durationBtn}
                onPress={() => adjustDuration(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.durationBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, isDone && styles.primaryBtnSuccess]}
            onPress={handleStartPause}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isDone ? 'Done! Restart' : running ? 'Pause' : elapsedMs > 0 ? 'Resume' : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 48,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  emomHeader: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.accent.primary,
    textAlign: 'center',
    fontSize: 20,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bellEmoji: {
    fontSize: 32,
  },
  minuteIndicator: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    fontSize: 13,
    marginLeft: 8,
  },
  countdown: {
    fontFamily: 'VT323_400Regular',
    textAlign: 'center',
    color: Colors.accent.acid,
    marginBottom: 16,
    fontSize: 96,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 3,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent.primary,
    borderRadius: 3,
  },
  durationRow: {
    alignItems: 'center',
    marginBottom: 28,
  },
  durationLabel: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.secondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  durationBtn: {
    width: 44,          // Satisfies the 44x44 minimum touch target size
    height: 44,         // Satisfies the 44x44 minimum touch target size
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBtnText: {
    fontFamily: 'VT323_400Regular',
    color: Colors.text.primary,
    fontSize: 28,
    lineHeight: 30,
  },
  durationValue: {
    fontFamily: 'VT323_400Regular',
    color: Colors.accent.acid,
    fontSize: 28,
    marginHorizontal: 20,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontFamily: 'Anton_400Regular',
    color: Colors.text.secondary,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  primaryBtn: {
    flex: 2,
    height: 52,
    backgroundColor: Colors.accent.primary,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnSuccess: {
    backgroundColor: Colors.status.success,
    shadowColor: Colors.status.success,
  },
  primaryBtnText: {
    fontFamily: 'Bungee_400Regular',
    color: Colors.text.inverse,
    fontSize: 16,
  },
});
