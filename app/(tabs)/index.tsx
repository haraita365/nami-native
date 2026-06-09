import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Modal, FlatList, RefreshControl, Linking, StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLevel } from '@/lib/useLevel';
import { useHomeArea } from '@/lib/useHomeArea';
import { getAptitude } from '@/lib/level';
import { computeSimpleLevelScore } from '@/lib/levelScore';
import { getWeatherAlert } from '@/lib/alert';
import { AREA_ORDER } from '@/lib/spots';
import { useAreaWaveData, type AreaSpotRow } from '@/lib/useAreaWaveData';
import { useTsunamiData } from '@/lib/useTsunamiData';

// ── ヘルパー ──────────────────────────────────────────────────────
function stars(n: number): string {
  const c = Math.max(0, Math.min(5, n));
  return '★'.repeat(c) + '☆'.repeat(5 - c);
}

function formatDelta(d: number): string {
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}m`;
}

function deltaColor(d: number): string {
  if (d > 0.05) return '#F97316';
  if (d < -0.05) return '#5B9DEF';
  return C.muted;
}

function windLabel(cond: 'offshore' | 'side' | 'onshore', dir: number): string {
  const compass = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const c = compass[Math.round(dir / 22.5) % 16];
  if (cond === 'offshore') return `↙オフ ${c}`;
  if (cond === 'side')     return `→サイド ${c}`;
  return `↑オン ${c}`;
}

function windColor(cond: 'offshore' | 'side' | 'onshore'): string {
  if (cond === 'offshore') return C.teal;
  if (cond === 'side')     return '#FAB347';
  return '#F26B6B';
}

function scoreColor(score: number): string {
  if (score >= 60) return C.teal;
  if (score >= 40) return '#FAB347';
  return '#F26B6B';
}

function aptColors(apt: '◎' | '○' | '△') {
  if (apt === '◎') return { color: C.teal,    bg: 'rgba(45,212,191,0.12)',  border: 'rgba(45,212,191,0.30)' };
  if (apt === '○') return { color: '#FAB347', bg: 'rgba(250,179,71,0.12)', border: 'rgba(250,179,71,0.30)' };
  return { color: C.muted, bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)' };
}

const WEATHER_COLORS = {
  danger:  { bg: 'rgba(242,107,107,0.12)', border: 'rgba(242,107,107,0.45)', text: '#F26B6B' },
  warning: { bg: 'rgba(250,179,71,0.10)',  border: 'rgba(250,179,71,0.45)',  text: '#FAB347' },
  caution: { bg: 'rgba(250,179,71,0.07)',  border: 'rgba(250,179,71,0.28)',  text: '#FAB347' },
};

// ── メイン画面 ────────────────────────────────────────────────────
export default function HomeScreen() {
  const [level, , levelLoading] = useLevel();
  const [homeArea, setHomeArea, areaLoading] = useHomeArea();
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [sort, setSort] = useState<'geo' | 'score'>('geo');

  const { data: rows, isLoading, isError, refetch, isFetching } = useAreaWaveData(homeArea);
  const { alert: tsunamiAlert, fetchError: tsunamiFetchError } = useTsunamiData(homeArea);

  const isBootLoading = levelLoading || areaLoading;

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => {
      if (sort !== 'score') return a.geoIdx - b.geoIdx;
      if (level) {
        const aS = computeSimpleLevelScore(a.waveHeight, a.wavePeriod, a.windCondition, a.windSpeed, level);
        const bS = computeSimpleLevelScore(b.waveHeight, b.wavePeriod, b.windCondition, b.windSpeed, level);
        return bS - aS;
      }
      return b.score - a.score;
    });
  }, [rows, sort, level]);

  const bestRow = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    return [...rows].sort((a, b) => {
      if (level) {
        const aS = computeSimpleLevelScore(a.waveHeight, a.wavePeriod, a.windCondition, a.windSpeed, level);
        const bS = computeSimpleLevelScore(b.waveHeight, b.wavePeriod, b.windCondition, b.windSpeed, level);
        return bS - aS;
      }
      return b.score - a.score;
    })[0] ?? null;
  }, [rows, level]);

  const weatherAlert = useMemo(() => {
    if (!rows) return null;
    const priority = { danger: 3, warning: 2, caution: 1 } as const;
    let worst: ReturnType<typeof getWeatherAlert> = null;
    for (const r of rows) {
      const a = getWeatherAlert(r.windSpeed, r.waveHeight);
      if (!a) continue;
      if (!worst || priority[a.level] > priority[worst.level]) worst = a;
    }
    return worst;
  }, [rows]);

  if (isBootLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={C.teal} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── ヘッダー ──────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logo}>NAMI</Text>
          <Text style={styles.logoBeta}>β</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.areaPill, pressed && { opacity: 0.7 }]}
          onPress={() => setAreaModalVisible(true)}
        >
          <Text style={styles.areaPillText}>{homeArea}</Text>
          <Text style={styles.areaPillChev}>⌄</Text>
        </Pressable>
      </View>

      {/* ── スクロール領域 ──────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={C.teal}
          />
        }
      >
        {/* 津波バナー（最高優先） */}
        {tsunamiFetchError ? (
          <Pressable
            style={styles.tsunamiError}
            onPress={() => Linking.openURL('https://www.jma.go.jp/bosai/map.html#contents=tsunami')}
          >
            <Text style={styles.tsunamiErrorText}>
              ⚠️ 津波情報の取得に失敗。気象庁で確認してください →
            </Text>
          </Pressable>
        ) : tsunamiAlert ? (
          <Pressable
            style={[
              styles.tsunamiBanner,
              tsunamiAlert.level === 'major'    && styles.tsunamiBannerMajor,
              tsunamiAlert.level === 'warning'  && styles.tsunamiBannerWarning,
              tsunamiAlert.level === 'advisory' && styles.tsunamiBannerAdvisory,
            ]}
            onPress={() => Linking.openURL('https://www.jma.go.jp/bosai/map.html#contents=tsunami')}
          >
            <Text style={styles.tsunamiBannerEmoji}>
              {tsunamiAlert.level === 'major' ? '🚨' : '⚠️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.tsunamiBannerTitle,
                { color: tsunamiAlert.level === 'major' ? '#F26B6B' : '#FAB347' },
              ]}>
                {tsunamiAlert.label}が発令中
              </Text>
              <Text style={styles.tsunamiBannerBody}>
                {tsunamiAlert.areaNames.slice(0, 2).join('・')}{tsunamiAlert.areaNames.length > 2 ? ' ほか' : ''} · 気象庁で詳細を確認 →
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* 荒天アラートバナー */}
        {!tsunamiAlert && !tsunamiFetchError && weatherAlert ? (
          <View style={[
            styles.alertBanner,
            { backgroundColor: WEATHER_COLORS[weatherAlert.level].bg,
              borderColor:      WEATHER_COLORS[weatherAlert.level].border },
          ]}>
            <Text style={[styles.alertBannerTitle, { color: WEATHER_COLORS[weatherAlert.level].text }]}>
              {weatherAlert.level === 'danger' ? '🚨' : '⚠️'} {weatherAlert.title}
            </Text>
            <Text style={styles.alertBannerBody}>{weatherAlert.detail}</Text>
          </View>
        ) : null}

        {/* ローディング */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={C.teal} size="large" />
            <Text style={styles.loadingText}>波のデータを取得中…</Text>
          </View>
        )}

        {/* エラー */}
        {isError && !isLoading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>データの取得に失敗しました</Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
              onPress={() => void refetch()}
            >
              <Text style={styles.retryBtnText}>再読み込み</Text>
            </Pressable>
          </View>
        )}

        {/* ベストスポットカード */}
        {bestRow && !isLoading && (
          <BestSpotCard row={bestRow} level={level} hasTsunami={!!tsunamiAlert} />
        )}

        {/* ソートトグル */}
        {rows && rows.length > 0 && !isLoading && (
          <View style={styles.sortRow}>
            {(['geo', 'score'] as const).map((s) => (
              <Pressable
                key={s}
                style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
                onPress={() => setSort(s)}
              >
                <Text style={[styles.sortBtnText, sort === s && styles.sortBtnTextActive]}>
                  {s === 'geo' ? '地理順' : 'スコア順'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* スポット一覧 */}
        {sortedRows.map((row) => (
          <SpotRow key={row.id} row={row} level={level} hasTsunami={!!tsunamiAlert} />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── エリア選択モーダル ─────────────────────────── */}
      <Modal
        visible={areaModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAreaModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>エリアを選ぶ</Text>
            <Pressable onPress={() => setAreaModalVisible(false)}>
              <Text style={styles.modalClose}>閉じる</Text>
            </Pressable>
          </View>
          <FlatList
            data={AREA_ORDER}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const active = item === homeArea;
              return (
                <Pressable
                  style={[styles.modalAreaRow, active && styles.modalAreaRowActive]}
                  onPress={() => {
                    void setHomeArea(item);
                    setAreaModalVisible(false);
                  }}
                  android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
                >
                  <Text style={[styles.modalAreaName, active && styles.modalAreaNameActive]}>
                    {item}
                  </Text>
                  {active && <Text style={styles.modalAreaCheck}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── ベストスポットカード ──────────────────────────────────────────
type LevelArg = Parameters<typeof getAptitude>[4];

function BestSpotCard({
  row, level, hasTsunami,
}: { row: AreaSpotRow; level: LevelArg | null; hasTsunami: boolean }) {
  const router = useRouter();
  const apt = level
    ? getAptitude(row.waveHeight, row.wavePeriod, row.windCondition, row.windSpeed, level)
    : null;
  const aptC = apt ? aptColors(apt) : null;
  const displayScore = level
    ? computeSimpleLevelScore(row.waveHeight, row.wavePeriod, row.windCondition, row.windSpeed, level)
    : row.score;
  const sc = scoreColor(displayScore);

  return (
    <Pressable
      style={({ pressed }) => [styles.summaryCard, hasTsunami && styles.summaryCardDimmed, pressed && { opacity: 0.7 }]}
      onPress={() => router.push(`/spot/${row.id}`)}
    >
      <Text style={styles.summaryLabel}>このエリアのベストスポット</Text>
      <View style={styles.summaryNameRow}>
        <Text style={styles.summaryName}>{row.name}</Text>
        {apt && aptC && (
          <View style={[styles.aptBadge, { backgroundColor: aptC.bg, borderColor: aptC.border }]}>
            <Text style={[styles.aptBadgeText, { color: aptC.color }]}>{apt}</Text>
          </View>
        )}
      </View>
      <View style={styles.summaryStarRow}>
        <Text style={[styles.summaryStarText, { color: hasTsunami ? C.muted : sc }]}>
          {stars(hasTsunami ? 0 : Math.round(displayScore / 20))}
        </Text>
        {hasTsunami && <Text style={styles.tsunamiGrayout}>（津波警報発令中）</Text>}
      </View>
      <View style={styles.summaryDetail}>
        <Text style={styles.summaryDetailText}>
          {row.waveHeight.toFixed(1)}m  周期{row.wavePeriod.toFixed(0)}s
        </Text>
        <Text style={[styles.summaryWindText, { color: windColor(row.windCondition) }]}>
          {windLabel(row.windCondition, row.windDirection)}  {row.windSpeed.toFixed(1)}m/s
        </Text>
      </View>
    </Pressable>
  );
}

// ── スポット行 ────────────────────────────────────────────────────
function SpotRow({
  row, level, hasTsunami,
}: { row: AreaSpotRow; level: LevelArg | null; hasTsunami: boolean }) {
  const router = useRouter();
  const apt = level
    ? getAptitude(row.waveHeight, row.wavePeriod, row.windCondition, row.windSpeed, level)
    : null;
  const aptC = apt ? aptColors(apt) : null;
  const displayScore = level
    ? computeSimpleLevelScore(row.waveHeight, row.wavePeriod, row.windCondition, row.windSpeed, level)
    : row.score;
  const sc = scoreColor(displayScore);
  const wc = windColor(row.windCondition);

  return (
    <Pressable
      style={({ pressed }) => [styles.spotRow, hasTsunami && styles.spotRowDimmed, pressed && { opacity: 0.7 }]}
      onPress={() => router.push(`/spot/${row.id}`)}
    >
      <View style={styles.spotLeft}>
        <View style={styles.spotNameRow}>
          <Text style={styles.spotName}>{row.name}</Text>
          {apt && aptC && (
            <View style={[styles.aptBadge, { backgroundColor: aptC.bg, borderColor: aptC.border }]}>
              <Text style={[styles.aptBadgeText, { color: aptC.color }]}>{apt}</Text>
            </View>
          )}
        </View>
        <Text style={styles.spotWave}>
          {row.waveHeight.toFixed(1)}m ({row.waveMin.toFixed(1)}–{row.waveMax.toFixed(1)}) · 周期{row.wavePeriod.toFixed(0)}s
        </Text>
        <View style={styles.spotMetaRow}>
          <Text style={[styles.spotWind, { color: wc }]}>
            {windLabel(row.windCondition, row.windDirection)}  {row.windSpeed.toFixed(1)}m/s
          </Text>
          <Text style={styles.spotConf}>信頼度:{row.confidenceStr}</Text>
        </View>
      </View>

      <View style={styles.spotRight}>
        <Text style={[styles.spotStars, { color: hasTsunami ? C.muted : sc }]}>
          {stars(hasTsunami ? 0 : Math.round(displayScore / 20))}
        </Text>
        {row.waveHeightDelta != null && (
          <Text style={[styles.spotDelta, { color: deltaColor(row.waveHeightDelta) }]}>
            {formatDelta(row.waveHeightDelta)}
          </Text>
        )}
      </View>
    </Pressable>
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
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { paddingHorizontal: 16, paddingTop: 12, gap: 12 },

  // ヘッダー
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  logo:    { fontSize: 22, fontWeight: '900', color: C.teal, letterSpacing: 1 },
  logoBeta:{ fontSize: 11, fontWeight: '700', color: C.muted },
  areaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.tealBg, borderRadius: 20,
    borderWidth: 1, borderColor: C.tealBorder,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  areaPillText: { fontSize: 13, fontWeight: '700', color: C.teal },
  areaPillChev: { fontSize: 11, color: C.teal },

  // ローディング / エラー
  loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText:{ fontSize: 13, color: C.muted },
  errorBox:   { alignItems: 'center', paddingVertical: 40, gap: 12 },
  errorText:  { fontSize: 14, color: C.textSoft },
  retryBtn: {
    backgroundColor: C.tealBg, borderRadius: 12,
    borderWidth: 1, borderColor: C.tealBorder,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { fontSize: 13, fontWeight: '700', color: C.teal },

  // 津波バナー
  tsunamiError: {
    backgroundColor: 'rgba(250,179,71,0.10)',
    borderWidth: 1, borderColor: 'rgba(250,179,71,0.40)',
    borderRadius: 12, padding: 12,
  },
  tsunamiErrorText: { fontSize: 12, color: '#FAB347', lineHeight: 18 },
  tsunamiBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, borderWidth: 1.5, padding: 13,
  },
  tsunamiBannerMajor:   { backgroundColor: 'rgba(242,107,107,0.14)', borderColor: 'rgba(242,107,107,0.55)' },
  tsunamiBannerWarning: { backgroundColor: 'rgba(250,179,71,0.12)',  borderColor: 'rgba(250,179,71,0.50)' },
  tsunamiBannerAdvisory:{ backgroundColor: 'rgba(250,179,71,0.08)',  borderColor: 'rgba(250,179,71,0.35)' },
  tsunamiBannerEmoji:   { fontSize: 22, lineHeight: 26 },
  tsunamiBannerTitle:   { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  tsunamiBannerBody:    { fontSize: 12, color: C.textSoft, lineHeight: 17 },

  // 荒天アラートバナー
  alertBanner:      { borderRadius: 12, borderWidth: 1, padding: 13, gap: 4 },
  alertBannerTitle: { fontSize: 13, fontWeight: '800' },
  alertBannerBody:  { fontSize: 12, color: C.textSoft, lineHeight: 17 },

  // ベストスポットカード
  summaryCard: {
    backgroundColor: 'rgba(45,212,191,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: C.tealBorder,
    padding: 16, gap: 6,
  },
  summaryCardDimmed: { opacity: 0.55 },
  summaryLabel:   { fontSize: 11, color: C.muted, fontWeight: '600', letterSpacing: 0.5 },
  summaryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryName:    { fontSize: 20, fontWeight: '800', color: C.text, flex: 1 },
  summaryStarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryStarText:{ fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  tsunamiGrayout: { fontSize: 11, color: C.muted },
  summaryDetail:  { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 2 },
  summaryDetailText:{ fontSize: 13, color: C.textSoft },
  summaryWindText:  { fontSize: 13, fontWeight: '600' },

  // ソートトグル
  sortRow: { flexDirection: 'row', gap: 8 },
  sortBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sortBtnActive:     { backgroundColor: C.tealBg, borderColor: C.tealBorder },
  sortBtnText:       { fontSize: 12, fontWeight: '600', color: C.muted },
  sortBtnTextActive: { color: C.teal },

  // スポット行
  spotRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, gap: 10,
  },
  spotRowDimmed: { opacity: 0.45 },
  spotLeft:      { flex: 1, gap: 4 },
  spotRight:     { alignItems: 'flex-end', gap: 4, minWidth: 56 },
  spotNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spotName:      { fontSize: 14, fontWeight: '700', color: C.text, flexShrink: 1 },
  spotWave:      { fontSize: 12, color: C.textSoft },
  spotMetaRow:   { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  spotWind:      { fontSize: 12, fontWeight: '600' },
  spotConf:      { fontSize: 11, color: C.muted },
  spotStars:     { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  spotDelta:     { fontSize: 12, fontWeight: '600' },

  // aptバッジ
  aptBadge:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  aptBadgeText: { fontSize: 11, fontWeight: '700' },

  // モーダル
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  modalClose: { fontSize: 15, color: C.teal, fontWeight: '600' },
  modalAreaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.divider,
    overflow: Platform.OS === 'android' ? 'hidden' : undefined,
  },
  modalAreaRowActive: { backgroundColor: 'rgba(45,212,191,0.06)' },
  modalAreaName:       { fontSize: 15, color: C.textSoft, fontWeight: '600' },
  modalAreaNameActive: { color: C.text, fontWeight: '700' },
  modalAreaCheck:      { fontSize: 16, color: C.teal, fontWeight: '700' },
});
