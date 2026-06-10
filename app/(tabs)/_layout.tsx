import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.bg.secondary,
          borderTopColor: Colors.border,
          borderTopWidth: 1.5,
          height: 68,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarActiveTintColor: Colors.accent.primary,
        tabBarInactiveTintColor: Colors.text.muted,
        headerStyle: { backgroundColor: Colors.bg.primary },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: {
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.4,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarLabel: 'Today',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>🏋️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>📈</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach Settings',
          tabBarLabel: 'Coach',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>🎯</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: 'My Equipment',
          tabBarLabel: 'Kit',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
