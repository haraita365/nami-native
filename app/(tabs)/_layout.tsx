import { Tabs } from 'expo-router';
import { Waves, CalendarDays, Map, ShoppingBag, User } from 'lucide-react-native';

const TINT     = '#2DD4BF';
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
          tabBarIcon: ({ color, size }) => <Waves color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: '16日間',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'マップ',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'ショップ',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: 'マイページ',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
