import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { BottomNavIcon } from '../../src/components/icons/AppIcons';

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
        tabBarActiveTintColor: Colors.accent.primary,
        tabBarInactiveTintColor: Colors.text.secondary,
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
          tabBarIcon: ({ focused }) => <BottomNavIcon name="today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => <BottomNavIcon name="history" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ focused }) => <BottomNavIcon name="progress" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach Settings',
          tabBarLabel: 'Coach',
          tabBarIcon: ({ focused }) => <BottomNavIcon name="coach" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: 'My Equipment',
          tabBarLabel: 'Kit',
          tabBarIcon: ({ focused }) => <BottomNavIcon name="kit" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
