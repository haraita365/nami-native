import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';

const TINT = '#2DD4BF';
const INACTIVE = '#6B7280';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TINT,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#0E1624',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '波予報',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🌊" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: '16日間',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="📅" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'マップ',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🗺️" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'ショップ',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🏄" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: 'マイページ',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="👤" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

import { Text, View } from 'react-native';

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: Platform.OS === 'ios' ? 22 : 20 }}>{emoji}</Text>
    </View>
  );
}
