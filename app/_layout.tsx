import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.bg.primary },
          headerTintColor: Colors.text.primary,
          contentStyle: { backgroundColor: Colors.bg.primary },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="freestyle"
          options={{ title: 'Freestyle', presentation: 'modal', headerShown: true }}
        />
        <Stack.Screen
          name="workout/index"
          options={{ title: 'Workout', presentation: 'modal', headerShown: true }}
        />
        <Stack.Screen
          name="workout/complete"
          options={{ title: 'Session Complete', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
