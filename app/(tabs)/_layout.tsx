import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import {
  TodayIcon,
  HistoryIcon,
  ProgressIcon,
  CoachIcon,
  KitIcon,
} from '../../src/components/icons/TabIcons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.bg.secondary,
          borderTopColor: Colors.accent.primary,
          borderTopWidth: 2,
          height: 68,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontFamily: 'VT323_400Regular',
          fontSize: 14,
          letterSpacing: 1,
          marginTop: 2,
        },
        tabBarActiveTintColor: Colors.accent.acid,
        tabBarInactiveTintColor: Colors.text.muted,
        headerStyle: { backgroundColor: Colors.bg.secondary },
        headerTintColor: Colors.accent.primary,
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
          tabBarIcon: ({ color }) => <TodayIcon color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => <HistoryIcon color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => <ProgressIcon color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach Settings',
          tabBarLabel: 'Coach',
          tabBarIcon: ({ color }) => <CoachIcon color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: 'My Equipment',
          tabBarLabel: 'Kit',
          tabBarIcon: ({ color }) => <KitIcon color={color as string} size={22} />,
        }}
      />
    </Tabs>
  );
}
