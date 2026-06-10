import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import { useFonts, Bungee_400Regular } from '@expo-google-fonts/bungee';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { Colors } from '../src/theme/colors';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Bungee_400Regular,
    Anton_400Regular,
    VT323_400Regular,
  });

  // Hold render until fonts are ready to avoid FOUT
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: Colors.bg.primary }} />;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.bg.secondary },
          headerTintColor: Colors.accent.primary,
          contentStyle: { backgroundColor: Colors.bg.primary },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: Platform.OS !== 'web' ? 'Anton_400Regular' : undefined,
            fontWeight: Platform.OS === 'web' ? '800' : undefined,
            color: Colors.text.primary,
          },
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
