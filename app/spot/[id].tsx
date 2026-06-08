import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPOTS } from '@/lib/spots';

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spot = SPOTS.find((s) => s.id === id);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{spot?.name ?? id}</Text>
        <Text style={styles.area}>{spot?.area ?? '—'}</Text>
        <Text style={styles.sub}>スポット詳細は Phase 2 で実装予定</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1624' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  name: { fontSize: 24, fontWeight: '800', color: '#F0F4F8' },
  area: { fontSize: 14, color: '#6B7280' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 8 },
});
