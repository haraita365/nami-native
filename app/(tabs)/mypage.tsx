import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLevel } from '@/lib/useLevel';
import { useHomeArea } from '@/lib/useHomeArea';
import { LEVEL_LABEL, type Level } from '@/lib/level';
import { AREA_ORDER } from '@/lib/spots';

// ── 定数 ─────────────────────────────────────────────────────────
const LEVELS: { id: Level; label: string; sub: string }[] = [
  { id: 'beginner',     label: '初級', sub: '〜2年\nホワイトウォーター中心' },
  { id: 'intermediate', label: '中級', sub: '2〜5年\nグリーンウェーブ挑戦中' },
  { id: 'advanced',     label: '上級', sub: '5年以上\nコンスタントに乗れる' },
];

const FEEDBACK_URL = 'https://forms.gle/RcFhr6GfWWVP4bAXA';

// ── 画面 ──────────────────────────────────────────────────────────
export default function MyPageScreen() {
  const [level, setLevel, levelLoading] = useLevel();
  const [homeArea, setHomeArea, areaLoading] = useHomeArea();

  if (levelLoading || areaLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={C.teal} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const currentLevel = LEVELS.find((l) => l.id === level);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ヘッダー ──────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.logo}>NAMI</Text>
          <Text style={styles.logoBeta}>（仮）</Text>
        </View>

        {/* ── プロフィールカード ─────────────────── */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🏄</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={styles.profileName}>サーファー</Text>
              <Text style={styles.profileSub}>NAMI ユーザー</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.statLabel}>ホームエリア</Text>
              <Text style={styles.statValue}>{homeArea}</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.statLabel}>サーフレベル</Text>
              <Text style={styles.statValue}>{currentLevel?.label ?? '未設定'}</Text>
            </View>
          </View>
        </View>

        {/* ── レベル設定 ────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>レベル設定</Text>
          <Text style={styles.cardHint}>設定したレベルに合わせたアドバイスが届きます</Text>

          <View style={styles.levelGrid}>
            {LEVELS.map((l) => {
              const active = level === l.id;
              return (
                <Pressable
                  key={l.id}
                  style={[styles.levelBtn, active && styles.levelBtnActive]}
                  onPress={() => setLevel(l.id)}
                  android_ripple={{ color: 'rgba(45,212,191,0.2)' }}
                >
                  <Text style={[styles.levelBtnName, active && styles.levelBtnNameActive]}>
                    {l.label}
                  </Text>
                  <Text style={[styles.levelBtnSub, active && styles.levelBtnSubActive]}>
                    {l.sub}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {currentLevel && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>
                ✓ {currentLevel.label}レベルに設定しました（自動保存）
              </Text>
            </View>
          )}
        </View>

        {/* ── ホームエリア設定 ──────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ホームエリア設定</Text>
          <Text style={styles.cardHint}>エリアを選ぶと、配下のスポットをまとめて確認できます</Text>

          {AREA_ORDER.map((area) => {
            const active = area === homeArea;
            return (
              <Pressable
                key={area}
                style={[styles.areaRow, active && styles.areaRowActive]}
                onPress={() => setHomeArea(area)}
                android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
              >
                <Text style={[styles.areaName, active && styles.areaNameActive]}>
                  {area}
                </Text>
                {active ? (
                  <View style={styles.areaActiveBadge}>
                    <Text style={styles.areaActiveBadgeText}>いまのエリア</Text>
                  </View>
                ) : (
                  <Text style={styles.areaChev}>›</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── フィードバック ────────────────────── */}
        <View style={[styles.card, styles.feedbackCard]}>
          <Text style={styles.feedbackTitle}>フィードバックを送る</Text>
          <Text style={styles.feedbackBody}>
            作っているだけでは気づけないことだらけです。「ここが分かりにくい」「この情報が欲しい」など、どんな小さなことでも教えていただけると本当に助かります。
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.feedbackBtn,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => Linking.openURL(FEEDBACK_URL)}
          >
            <Text style={styles.feedbackBtnText}>フィードバックフォームを開く →</Text>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── デザイントークン ──────────────────────────────────────────────
const C = {
  bg:         '#0E1624',
  card:       'rgba(255,255,255,0.04)',
  border:     'rgba(255,255,255,0.10)',
  teal:       '#2DD4BF',
  tealBg:     'rgba(45,212,191,0.10)',
  tealBorder: 'rgba(45,212,191,0.25)',
  text:       '#F0F4F8',
  textSoft:   '#9CA3AF',
  muted:      '#6B7280',
  divider:    'rgba(255,255,255,0.08)',
};

// ── スタイル ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  scroll:     { padding: 20, gap: 16 },

  // ヘッダー
  header:     { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  logo:       { fontSize: 26, fontWeight: '900', color: C.teal, letterSpacing: 1 },
  logoBeta:   { fontSize: 12, fontWeight: '700', color: C.textSoft },

  // カード共通
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 0,
  },
  cardTitle:  { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardHint:   { fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 18 },

  // プロフィール
  profileRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatar:       {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji:  { fontSize: 24 },
  profileName:  { fontSize: 16, fontWeight: '700', color: C.text },
  profileSub:   { fontSize: 12, color: C.muted },
  divider:      { height: 1, backgroundColor: C.divider, marginBottom: 14 },
  profileStats: { flexDirection: 'row', gap: 24 },
  profileStat:  { gap: 3 },
  statLabel:    { fontSize: 11, color: C.muted },
  statValue:    { fontSize: 14, fontWeight: '700', color: C.text },

  // レベルボタン
  levelGrid: { flexDirection: 'row', gap: 10 },
  levelBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    gap: 6,
    overflow: Platform.OS === 'android' ? 'hidden' : undefined,
  },
  levelBtnActive: {
    backgroundColor: C.tealBg,
    borderColor: C.teal,
  },
  levelBtnName: { fontSize: 15, fontWeight: '800', color: C.textSoft },
  levelBtnNameActive: { color: C.teal },
  levelBtnSub:  { fontSize: 10, color: C.muted, textAlign: 'center', lineHeight: 14 },
  levelBtnSubActive: { color: 'rgba(45,212,191,0.80)' },

  // 保存バッジ
  savedBadge: {
    marginTop: 12,
    padding: 10,
    backgroundColor: C.tealBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.tealBorder,
  },
  savedBadgeText: { fontSize: 12, color: C.teal, fontWeight: '600' },

  // エリアリスト
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    overflow: Platform.OS === 'android' ? 'hidden' : undefined,
  },
  areaRowActive: { /* 背景なし — バッジで示す */ },
  areaName: { fontSize: 14, fontWeight: '600', color: C.textSoft },
  areaNameActive: { color: C.text, fontWeight: '700' },
  areaActiveBadge: {
    backgroundColor: C.tealBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.tealBorder,
  },
  areaActiveBadgeText: { fontSize: 11, color: C.teal, fontWeight: '700' },
  areaChev: { fontSize: 18, color: C.muted, lineHeight: 22 },

  // フィードバック
  feedbackCard: {
    backgroundColor: 'rgba(45,212,191,0.04)',
    borderColor: C.tealBorder,
  },
  feedbackTitle: { fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 8 },
  feedbackBody:  { fontSize: 12, color: C.textSoft, lineHeight: 19, marginBottom: 14 },
  feedbackBtn: {
    backgroundColor: C.tealBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.35)',
    paddingVertical: 13,
    alignItems: 'center',
  },
  feedbackBtnText: { fontSize: 13, fontWeight: '700', color: C.teal, letterSpacing: 0.3 },
});
