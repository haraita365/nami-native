import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Modal, FlatList, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useLevel } from '@/lib/useLevel';
import { useHomeArea } from '@/lib/useHomeArea';
import { getAreaSpots, AREA_ORDER } from '@/lib/spots';
import { fetchSpotDataFull, nowJST } from '@/lib/api';
import type { DailyEntry } from '@/lib/api';
import { getWindCondition, getDirectionLabel } from '@/lib/wind';
import { scoreDailyEntry } from '@/lib/scoring';
import { computeSimpleLevelScore } from '@/lib/levelScore';
import type { Level } from '@/lib/level';
import { getAptitude } from '@/lib/level';
import { getWaveSizeLabel, getConfidenceLabel } from '@/lib/wave';
import { getWeatherAlert } from '@/lib/alert';

// ── ヘルパー ──────────────────────────────────────────────────────
function windCondStr(cond: 'offshore' | 'side' | 'onshore'): string {
  if (cond === 'offshore') return '↙オフ';
  if (cond === 'side')     return '→サイド';
  return '↑オン';
}

function windColor(cond: 'offshore' | 'side' | 'onshore'): string {
  if (cond === 'offshore') return C.teal;
  if (cond === 'side')     return '#FAB347';
  return '#F26B6B';
}

function weatherEmoji(code: number): string {
  if (code === 0)   return '☀️';
  if (code <= 3)    return '⛅';
  if (code <= 48)   return '🌫';
  if (code <= 67)   return '🌧';
  if (code <= 77)   return '❄️';
  if (code <= 82)   return '🌦';
  if (code <= 99)   return '⛈';
  return '—';
}

function getDailyScore(
  entry: DailyEntry,
  beachDirection: number,
  level: Level | null,
): number {
  const windCond = getWindCondition(entry.noonWindDir, beachDirection);
  if (level) {
    return computeSimpleLevelScore(
      entry.maxWaveHeight, entry.maxWavePeriod, windCond, entry.avgWindSpeed, level,
    );
  }
  return scoreDailyEntry(entry, beachDirection);
}

// 今日より後の直近7日間から最良の日を選定（Web版 getLevelBestDailyEntry 相当）
function getBestDayDate(
  daily: DailyEntry[],
  todayStr: string,
  beachDirection: number,
  level: Level | null,
): string | null {
  const candidates = daily.filter(d => d.date > todayStr).slice(0, 7);
  if (candidates.length === 0) return null;

  if (!level) {
    return candidates.reduce((best, d) =>
      getDailyScore(d, beachDirection, null) > getDailyScore(best, beachDirection, null) ? d : best,
    ).date;
  }

  // レベル設定時: 適性◎優先 → 同ランク内はスコアで選択
  const ranked = candidates.map(d => {
    const wc  = getWindCondition(d.noonWindDir, beachDirection);
    const apt = getAptitude(d.maxWaveHeight, d.maxWavePeriod, wc, d.avgWindSpeed, level);
    const aptRank = apt === '◎' ? 0 : apt === '○' ? 1 : 2;
    return { date: d.date, aptRank, score: getDailyScore(d, beachDirection, level) };
  });
  ranked.sort((a, b) => a.aptRank !== b.aptRank ? a.aptRank - b.aptRank : b.score - a.score);
  return ranked[0]?.date ?? null;
}

// ── メイン画面 ────────────────────────────────────────────────────
export default function ForecastScreen() {
  const [level, , levelLoading] = useLevel();
  const [homeArea, setHomeArea, areaLoading] = useHomeArea();
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  const areaSpots = useMemo(() => getAreaSpots(homeArea), [homeArea]);

  useEffect(() => {
    setSelectedSpotId(null);
  }, [homeArea]);

  const selectedSpot = useMemo(() => {
    if (selectedSpotId) {
      const found = areaSpots.find((s) => s.id === selectedSpotId);
      if (found) return found;
    }
    return areaSpots[0] ?? null;
  }, [areaSpots, selectedSpotId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['forecast', selectedSpot?.id],
    queryFn: () => {
      if (!selectedSpot) throw new Error('no spot');
      return fetchSpotDataFull(selectedSpot.lat, selectedSpot.lng);
    },
    enabled: !!selectedSpot,
    staleTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if ((error as Error)?.message?.includes('429')) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const { date: todayStr } = nowJST();
  const isBootLoading = levelLoading || areaLoading;

  const bestDayDate = useMemo(() => {
    if (!data?.daily || !selectedSpot) return null;
    return getBestDayDate(data.daily, todayStr, selectedSpot.beachDirection, level);
  }, [data?.daily, todayStr, selectedSpot, level]);

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
        <View>
          <View style={styles.logoRow}>
            <Text style={styles.logo}>NAMI（仮）</Text>
            <Text style={styles.logoBeta}>β版</Text>
          </View>
          <Text style={styles.logoBetaNote}>※β版・改善中</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.areaPill, pressed && { opacity: 0.7 }]}
          onPress={() => setAreaModalVisible(true)}
        >
          <Text style={styles.areaPillText}>{homeArea}</Text>
          <Text style={styles.areaPillChev}>⌄</Text>
        </Pressable>
      </View>

      {/* ── スポット選択（横スクロールタブ） ───────────── */}
      {areaSpots.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.spotTabsBar}
          contentContainerStyle={styles.spotTabsContent}
        >
          {areaSpots.map(s => {
            const active = s.id === selectedSpot?.id;
            return (
              <Pressable
                key={s.id}
                style={[styles.spotTab, active && styles.spotTabActive]}
                onPress={() => setSelectedSpotId(s.id)}
              >
                <Text style={[styles.spotTabText, active && styles.spotTabTextActive]}>
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── スクロール領域 ──────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ローディング */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={C.teal} size="large" />
            <Text style={styles.loadingText}>16日間の予報を取得中…</Text>
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

        {/* 日別リスト */}
        {!isLoading && !isError && data && selectedSpot && (
          <>
            <Text style={styles.sectionTitle}>16日間予報</Text>
            {data.daily.map((entry) => (
              <DayRow
                key={entry.date}
                entry={entry}
                beachDirection={selectedSpot.beachDirection}
                level={level}
                isToday={entry.date === todayStr}
                isPeak={entry.date === bestDayDate}
              />
            ))}
          </>
        )}

        {/* 注記 */}
        {!isLoading && !isError && data && (
          <View style={styles.footnote}>
            <Text style={styles.footnoteText}>
              ※予報のため実際の波況と異なる場合があります。参考情報としてご利用ください。
            </Text>
            <Text style={styles.footnoteText}>
              ※信頼度は直近2日分のみ表示（3モデル比較が可能な範囲のみ）。
            </Text>
          </View>
        )}

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
                  style={[styles.modalRow, active && styles.modalRowActive]}
                  onPress={() => { void setHomeArea(item); setAreaModalVisible(false); }}
                  android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
                >
                  <Text style={[styles.modalRowName, active && styles.modalRowNameActive]}>{item}</Text>
                  {active && <Text style={styles.modalRowCheck}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── 日別行 ────────────────────────────────────────────────────────
function DayRow({
  entry, beachDirection, level, isToday, isPeak,
}: {
  entry: DailyEntry;
  beachDirection: number;
  level: Level | null;
  isToday: boolean;
  isPeak: boolean;
}) {
  const windCond = getWindCondition(entry.noonWindDir, beachDirection);
  const wc = windColor(windCond);
  const conf = getConfidenceLabel(
    entry.maxWaveHeightMin, entry.maxWaveHeightMax, entry.maxWaveModelCount,
  );
  const rowAlert = getWeatherAlert(entry.avgWindSpeed, entry.maxWaveHeight);
  const dirLabel = getDirectionLabel(entry.noonWindDir);

  const d = new Date(`${entry.date}T12:00:00`);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

  // 波高色の優先順: alert > flat > today > peak > default
  const waveColor = rowAlert
    ? (rowAlert.level === 'danger' ? '#F26B6B' : '#FAB347')
    : entry.maxWaveHeight < 0.3
    ? C.muted
    : isToday
    ? C.blue
    : isPeak
    ? C.teal
    : C.text;

  // 日付・曜日色
  const dateColor = isToday ? C.blue : isPeak ? C.teal : C.muted;

  // 行ボーダー: today > peak > default
  const rowBorderStyle = isToday
    ? styles.dayRowToday
    : isPeak
    ? styles.dayRowPeak
    : null;

  const dowText = isToday ? 'TODAY' : isPeak ? `${entry.dayLabel} 🔥` : entry.dayLabel;

  return (
    <View style={[styles.dayRow, rowBorderStyle]}>
      {/* 左: 日付・曜日 */}
      <View style={styles.dayLeft}>
        <Text style={[styles.dayDate, { color: dateColor }, (isToday || isPeak) && styles.dayDateBold]}>
          {dateStr}
        </Text>
        <Text style={[styles.dayDow, { color: dateColor }, (isToday || isPeak) && styles.dayDowBold]}>
          {dowText}
        </Text>
      </View>

      {/* 中央: 体感・信頼度・meta */}
      <View style={styles.dayCenter}>
        {/* Row1: 体感サイズ + 警告バッジ */}
        <View style={styles.dayCenterTop}>
          <Text style={styles.daySizeLabel}>{getWaveSizeLabel(entry.maxWaveHeight)}</Text>
          {rowAlert && (
            <Text style={[
              styles.dayAlertBadge,
              { color: rowAlert.level === 'danger' ? '#F26B6B' : '#FAB347' },
            ]}>
              {rowAlert.level === 'danger' ? '🚨危険' : '⚠️荒天'}
            </Text>
          )}
        </View>
        {/* Row2: 信頼度（modelCount=0 なら非表示） */}
        {conf !== null && (
          <Text style={styles.dayConf}>信頼度：{conf}</Text>
        )}
        {/* Row3: 周期 + 風条件 + 風向 + 天気emoji */}
        <View style={styles.dayMeta}>
          <Text style={styles.dayMetaText}>{Math.round(entry.maxWavePeriod)}秒</Text>
          <Text style={[styles.dayMetaWind, { color: wc }]}>{windCondStr(windCond)}</Text>
          <Text style={styles.dayMetaText}>{dirLabel}</Text>
          <Text style={styles.dayWeather}>{weatherEmoji(entry.weatherCode)}</Text>
        </View>
      </View>

      {/* 右: 波高（主役） */}
      <Text style={[styles.dayWaveMain, { color: waveColor }]}>
        {entry.maxWaveHeight.toFixed(1)}m
      </Text>
    </View>
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
  blue:       '#5B9DEF',
  text:       '#F0F4F8',
  textSoft:   '#9CA3AF',
  muted:      '#6B7280',
  divider:    'rgba(255,255,255,0.08)',
};

// ── スタイル ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { paddingHorizontal: 16, paddingTop: 8 },

  // ヘッダー
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  logoRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  logo:        { fontSize: 22, fontWeight: '900', color: C.teal, letterSpacing: 1 },
  logoBeta:    { fontSize: 11, fontWeight: '700', color: C.muted },
  logoBetaNote:{ fontSize: 10, color: C.muted, marginTop: 1 },
  areaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.tealBg, borderRadius: 20,
    borderWidth: 1, borderColor: C.tealBorder,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  areaPillText: { fontSize: 13, fontWeight: '700', color: C.teal },
  areaPillChev: { fontSize: 11, color: C.teal },

  // スポットタブ（横スクロール）
  spotTabsBar:     { borderBottomWidth: 1, borderBottomColor: C.border },
  spotTabsContent: {
    paddingHorizontal: 16, paddingVertical: 8,
    gap: 8, flexDirection: 'row', alignItems: 'center',
  },
  spotTab: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card,
  },
  spotTabActive:     { backgroundColor: C.tealBg, borderColor: C.tealBorder },
  spotTabText:       { fontSize: 12, fontWeight: '600', color: C.textSoft },
  spotTabTextActive: { color: C.teal },

  // ローディング / エラー
  loadingBox:  { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 13, color: C.muted },
  errorBox:    { alignItems: 'center', paddingVertical: 60, gap: 12 },
  errorText:   { fontSize: 14, color: C.textSoft },
  retryBtn: {
    backgroundColor: C.tealBg, borderRadius: 12,
    borderWidth: 1, borderColor: C.tealBorder,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { fontSize: 13, fontWeight: '700', color: C.teal },

  // セクションタイトル
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginTop: 12, marginBottom: 6,
  },

  // 日別行
  dayRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 14, gap: 12,
    marginBottom: 8,
  },
  dayRowToday: { borderColor: 'rgba(91,157,239,0.35)' },
  dayRowPeak:  { borderColor: 'rgba(45,212,191,0.35)' },

  // 左列: 日付
  dayLeft:     { width: 56, gap: 2 },
  dayDate:     { fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'] },
  dayDateBold: { fontWeight: '700' },
  dayDow:      { fontSize: 10, fontWeight: '500' },
  dayDowBold:  { fontWeight: '700' },

  // 中央列
  dayCenter:    { flex: 1, gap: 2 },
  dayCenterTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  daySizeLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  dayAlertBadge:{ fontSize: 10, fontWeight: '700' },
  dayConf:      { fontSize: 10, color: C.muted },
  dayMeta:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 1 },
  dayMetaText:  { fontSize: 11, color: C.textSoft },
  dayMetaWind:  { fontSize: 11, fontWeight: '600' },
  dayWeather:   { fontSize: 12 },

  // 右列: 波高（主役）
  dayWaveMain: {
    fontSize: 20, fontWeight: '500', fontVariant: ['tabular-nums'],
    textAlign: 'right', minWidth: 52,
  },

  // 注記
  footnote:     { paddingTop: 4, paddingBottom: 8, gap: 4 },
  footnoteText: { fontSize: 10, color: C.muted, lineHeight: 15 },

  // モーダル
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  modalClose: { fontSize: 15, color: C.teal, fontWeight: '600' },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.divider,
    overflow: Platform.OS === 'android' ? 'hidden' : undefined,
  } as const,
  modalRowActive:      { backgroundColor: 'rgba(45,212,191,0.06)' },
  modalRowName:        { fontSize: 15, color: C.textSoft, fontWeight: '600' },
  modalRowNameActive:  { color: C.text, fontWeight: '700' },
  modalRowCheck:       { fontSize: 16, color: C.teal, fontWeight: '700' },
});
