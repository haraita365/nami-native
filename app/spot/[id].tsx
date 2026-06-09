import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPOTS } from '@/lib/spots';
import { fetchSpotDataFull, getCurrentSlot, nowJST } from '@/lib/api';
import { getWindCondition, getDirectionLabel } from '@/lib/wind';
import { formatWaveRange, getWaveSizeRangeLabel, getConfidenceStars } from '@/lib/wave';
import { scoreSlot } from '@/lib/scoring';
import { scoreToStars, computeSimpleLevelScore } from '@/lib/levelScore';
import { getAptitude } from '@/lib/level';
import { useLevel } from '@/lib/useLevel';

// ── ヘルパー（index.tsx と同じ考え方） ───────────────────────────
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
function windColor(cond: 'offshore' | 'side' | 'onshore'): string {
  if (cond === 'offshore') return C.teal;
  if (cond === 'side')     return '#FAB347';
  return '#F26B6B';
}
function windCondLabel(cond: 'offshore' | 'side' | 'onshore'): string {
  if (cond === 'offshore') return 'オフショア ◎  波面クリーン';
  if (cond === 'side')     return 'サイドショア △  やや乱れ';
  return 'オンショア ✕  波面荒れ';
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
function periodQuality(p: number): string {
  if (p >= 10) return '長め・良質';
  if (p >= 8)  return 'やや長め';
  return '短め';
}

// ── メイン画面 ────────────────────────────────────────────────────
export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [level] = useLevel();

  const spot = SPOTS.find((s) => s.id === id);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['spot-detail', id],
    queryFn: () => {
      if (!spot) throw new Error('スポットが見つかりません');
      return fetchSpotDataFull(spot.lat, spot.lng);
    },
    enabled: !!spot,
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });

  if (!spot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>スポットが見つかりません</Text>
          <Text style={styles.errorSub}>id: {id}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={styles.loadingText}>波のデータを取得中…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.errorEmoji}>🌊</Text>
          <Text style={styles.errorText}>波データを取得できませんでした</Text>
          <Text style={styles.retryLink} onPress={() => void refetch()}>
            再読み込み
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { slots, waveHeightDelta } = data;
  const current = getCurrentSlot(slots);
  const { hour } = nowJST();

  const windCond   = getWindCondition(current.windDirection, spot.beachDirection);
  const windDir    = getDirectionLabel(current.windDirection);
  const waveDir    = getDirectionLabel(current.waveDirection);
  const beachDir   = getDirectionLabel(spot.beachDirection);

  const generalScore = scoreSlot(current, spot.beachDirection);
  const levelScore   = level
    ? computeSimpleLevelScore(current.waveHeight, current.wavePeriod, windCond, current.windSpeed, level)
    : null;
  const displayScore = levelScore ?? generalScore;
  const displayStars = Math.round(displayScore / 20);
  const sc = scoreColor(displayScore);

  const apt  = level
    ? getAptitude(current.waveHeight, current.wavePeriod, windCond, current.windSpeed, level)
    : null;
  const aptC = apt ? aptColors(apt) : null;

  const conf = getConfidenceStars(current.waveHeightMin, current.waveHeightMax, current.waveModelCount) ?? '低';
  const wc   = windColor(windCond);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── スポットタイトル ──────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.areaLabel}>{spot.area}</Text>
          <Text style={styles.spotName}>{spot.name}</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE  {String(hour).padStart(2, '0')}:00 更新</Text>
            <Text style={styles.betaNote}>※予報・外れることあり</Text>
          </View>
        </View>

        {/* ── スコアヒーローカード ─────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroStars, { color: sc }]}>{stars(displayStars)}</Text>
              <Text style={[styles.heroScore, { color: sc }]}>{displayScore} / 100</Text>
            </View>
            {apt && aptC && (
              <View style={[styles.aptBadge, { backgroundColor: aptC.bg, borderColor: aptC.border }]}>
                <Text style={[styles.aptBadgeText, { color: aptC.color }]}>{apt}</Text>
              </View>
            )}
          </View>
          <View style={[styles.windCondBanner, { borderColor: wc }]}>
            <Text style={[styles.windCondText, { color: wc }]}>
              {windCondLabel(windCond)}
            </Text>
          </View>
        </View>

        {/* ── 波・気象スタッツ ─────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>現在の波況</Text>

          <View style={styles.statGrid}>
            {/* 波高 */}
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>波高</Text>
              <Text style={styles.statValue}>{current.waveHeight.toFixed(1)}m</Text>
              <Text style={styles.statSub}>{formatWaveRange(current.waveHeightMin, current.waveHeightMax)}</Text>
              <Text style={styles.statSub}>{getWaveSizeRangeLabel(current.waveHeightMin, current.waveHeightMax)}</Text>
              {waveHeightDelta != null && (
                <Text style={[styles.statDelta, { color: deltaColor(waveHeightDelta) }]}>
                  昨日比 {formatDelta(waveHeightDelta)}
                </Text>
              )}
            </View>

            {/* 周期 */}
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>周期</Text>
              <Text style={styles.statValue}>{Math.round(current.wavePeriod)}秒</Text>
              <Text style={styles.statSub}>{periodQuality(current.wavePeriod)}</Text>
            </View>

            {/* 信頼度 */}
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>信頼度</Text>
              <Text style={[
                styles.statValue,
                { color: conf === '高' ? C.teal : conf === '中' ? '#FAB347' : C.muted },
              ]}>
                {conf}
              </Text>
              <Text style={styles.statSub}>{current.waveModelCount}モデル</Text>
            </View>
          </View>
        </View>

        {/* ── 風・うねり詳細 ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>風・うねり詳細</Text>

          <View style={styles.infoTable}>
            <InfoRow label="風向き"  value={windDir}
              highlight={windCond === 'offshore' ? 'good' : windCond === 'onshore' ? 'bad' : null} />
            <InfoRow label="風速"    value={`${current.windSpeed.toFixed(1)} m/s`} />
            <InfoRow label="コンディション" value={
              windCond === 'offshore' ? 'オフショア ◎' :
              windCond === 'side'     ? 'サイドショア △' : 'オンショア ✕'
            }
              highlight={windCond === 'offshore' ? 'good' : windCond === 'onshore' ? 'bad' : null} />
            <InfoRow label="ビーチの向き" value={`${beachDir}向き`} />
            <InfoRow label="うねり方向"   value={waveDir} />
            {current.swellHeight > 0.2 && (
              <InfoRow label="スウェル" value={`${current.swellHeight.toFixed(1)}m  周期${Math.round(current.swellPeriod)}s`} />
            )}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 小コンポーネント ──────────────────────────────────────────────
function InfoRow({
  label, value, highlight,
}: { label: string; value: string; highlight?: 'good' | 'bad' | null }) {
  const vc = highlight === 'good' ? C.teal : highlight === 'bad' ? '#F26B6B' : C.textSoft;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: vc }]}>{value}</Text>
    </View>
  );
}

// ── デザイントークン（index.tsx と同一）──────────────────────────
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
  scroll:    { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  // センタリングボックス（ローディング・エラー）
  centerBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: 13, color: C.muted },
  errorEmoji:  { fontSize: 32 },
  errorText:   { fontSize: 15, fontWeight: '700', color: C.textSoft, textAlign: 'center' },
  errorSub:    { fontSize: 12, color: C.muted },
  retryLink:   { fontSize: 13, color: C.teal, fontWeight: '700', marginTop: 4 },

  // タイトルセクション
  titleSection: { paddingTop: 4, gap: 4 },
  areaLabel:    { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' } as const,
  spotName:     { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: 0.3 },
  liveRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  liveDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  liveText:     { fontSize: 11, color: C.teal, fontWeight: '700' },
  betaNote:     { fontSize: 10, color: C.muted },

  // スコアヒーローカード
  heroCard: {
    backgroundColor: 'rgba(45,212,191,0.06)',
    borderRadius: 18, borderWidth: 1, borderColor: C.tealBorder,
    padding: 18, gap: 12,
  },
  heroTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroStars:   { fontSize: 22, fontWeight: '700', letterSpacing: 1.5 },
  heroScore:   { fontSize: 13, fontWeight: '700', marginTop: 4 },
  windCondBanner: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  windCondText: { fontSize: 13, fontWeight: '700' },

  // aptバッジ
  aptBadge:     { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  aptBadgeText: { fontSize: 18, fontWeight: '800' },

  // 共通カード
  card: {
    backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.text },

  // スタッツグリッド
  statGrid: { flexDirection: 'row', gap: 0 },
  statCell: {
    flex: 1,
    paddingRight: 12,
    borderRightWidth: 1, borderRightColor: C.divider,
    gap: 3,
    marginRight: 12,
  },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', color: C.text },
  statSub:   { fontSize: 11, color: C.textSoft },
  statDelta: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // 風・うねり情報テーブル
  infoTable: { gap: 0 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  infoLabel: { fontSize: 12, color: C.muted },
  infoValue: { fontSize: 13, fontWeight: '700' },
});
