import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLevel } from '@/lib/useLevel';
import { useHomeArea } from '@/lib/useHomeArea';
import type { Level } from '@/lib/level';
import { LEVEL_LABEL } from '@/lib/level';

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
const AREAS = ['千葉北', '千葉南', '湘南', '茨城', '静岡', '伊豆'];

export default function MyPageScreen() {
  const [level, setLevel, levelLoading] = useLevel();
  const [homeArea, setHomeArea, areaLoading] = useHomeArea();

  if (levelLoading || areaLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#2DD4BF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>マイページ</Text>

        {/* レベル設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サーフィンレベル</Text>
          <View style={styles.pills}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.pill, level === l && styles.pillActive]}
                onPress={() => setLevel(l)}
              >
                <Text style={[styles.pillText, level === l && styles.pillTextActive]}>
                  {LEVEL_LABEL[l]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {level && (
            <Text style={styles.savedHint}>
              ✓ 保存済み：{LEVEL_LABEL[level]}（再起動後も保持されます）
            </Text>
          )}
        </View>

        {/* ホームエリア設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ホームエリア</Text>
          <View style={styles.pills}>
            {AREAS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.pill, homeArea === a && styles.pillActive]}
                onPress={() => setHomeArea(a)}
              >
                <Text style={[styles.pillText, homeArea === a && styles.pillTextActive]}>
                  {a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.savedHint}>
            ✓ 保存済み：{homeArea}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1624' },
  content: { flex: 1, padding: 24, gap: 32 },
  title: { fontSize: 22, fontWeight: '800', color: '#F0F4F8', marginTop: 8 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillActive: {
    backgroundColor: 'rgba(45,212,191,0.15)',
    borderColor: '#2DD4BF',
  },
  pillText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  pillTextActive: { color: '#2DD4BF' },
  savedHint: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
