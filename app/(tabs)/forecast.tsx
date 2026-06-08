import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForecastScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.placeholder}>16日間予報</Text>
        <Text style={styles.sub}>Phase 2 で実装予定</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1624' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholder: { fontSize: 20, fontWeight: '700', color: '#F0F4F8' },
  sub: { fontSize: 13, color: '#6B7280' },
});
