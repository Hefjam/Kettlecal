import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let pendingId: string | null = null;

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('rest-timer', {
    name: 'Rest Timer',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
  });
}

export async function requestRestNotificationPermission(): Promise<void> {
  if (Platform.OS === 'web') return;
  await setupNotificationChannel();
  await Notifications.requestPermissionsAsync();
}

export async function scheduleRestEnd(endsAt: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelRestEnd();
  const seconds = Math.ceil((endsAt - Date.now()) / 1000);
  if (seconds <= 1) return;
  try {
    pendingId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest complete',
        body: 'Time to lift.',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  } catch {
    // Scheduling unavailable (permissions denied, web, etc.)
  }
}

export async function cancelRestEnd(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!pendingId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(pendingId);
  } catch {
    // Already fired or invalid id
  }
  pendingId = null;
}
