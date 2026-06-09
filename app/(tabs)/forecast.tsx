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
import { getWindCondition } from '@/lib/wind';
import { scoreDailyEntry } from '@/lib/scoring';
import { computeSimpleLevelScore, scoreToStars } from '@/lib/levelScore';
import type { Level } from '@/lib/level';

// ── ヘルパー ──────────────────────────────────────────────────────
const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'] as const;

function windLabel(cond: 'offshore' | 'side' | 'onshore', dir: number): string {
  const d = COMPASS[Math.round(dir / 22.5) % 16] ?? 'N';
  const prefix = cond === 'offshore' ? '↙オフ' : cond === 'side' ? '→サイド' : '↑オン';
  return `${prefix} ${d}`;
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

function starsStr(n: number): string {
  const c = Math.max(0, Math.min(5, n));
  return '★'.repeat(c) + '☆'.repeat(5 - c);
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

// ── メイン画面 ────────────────────────────────────────────────────
export default function ForecastScreen() {
  const [level, , levelLoading] = useLevel();
  const [homeArea, setHomeArea, areaLoading] = useHomeArea();
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [spotModalVisible, setSpotModalVisible] = useState(false);
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
        <View style={styles.headerPills}>
          <Pressable
            style={({ pressed }) => [styles.areaPill, pressed && { opacity: 0.7 }]}
            onPress={() => setAreaModalVisible(true)}
          >
            <Text style={styles.areaPillText}>{homeArea}</Text>
            <Text style={styles.areaPillChev}>⌄</Text>
          </Pressable>
          {areaSpots.length > 1 && selectedSpot && (
            <Pressable
              style={({ pressed }) => [styles.spotPill, pressed && { opacity: 0.7 }]}
              onPress={() => setSpotModalVisible(true)}
            >
              <Text style={styles.spotPillText}>{selectedSpot.name}</Text>
              <Text style={styles.spotPillChev}>⌄</Text>
            </Pressable>
          )}
        </View>
      </View>

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
            {/* カラムヘッダー */}
            <View style={styles.colHeader}>
              <Text style={[styles.colHeaderText, styles.colDate]}>日付</Text>
              <Text style={[styles.colHeaderText, styles.colWave]}>波/周期</Text>
              <Text style={[styles.colHeaderText, styles.colWind]}>風</Text>
              <Text style={[styles.colHeaderText, styles.colScore]}>評価</Text>
            </View>

            {data.daily.map((entry) => (
              <DayRow
                key={entry.date}
                entry={entry}
                beachDirection={selectedSpot.beachDirection}
                level={level}
                isToday={entry.date === todayStr}
              />
            ))}
          </>
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

      {/* ── スポット選択モーダル ─────────────────────────── */}
      <Modal
        visible={spotModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSpotModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>スポットを選ぶ</Text>
            <Pressable onPress={() => setSpotModalVisible(false)}>
              <Text style={styles.modalClose}>閉じる</Text>
            </Pressable>
          </View>
          <FlatList
            data={areaSpots}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const active = item.id === selectedSpot?.id;
              return (
                <Pressable
                  style={[styles.modalRow, active && styles.modalRowActive]}
                  onPress={() => { setSelectedSpotId(item.id); setSpotModalVisible(false); }}
                  android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
                >
                  <Text style={[styles.modalRowName, active && styles.modalRowNameActive]}>{item.name}</Text>
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
  entry, beachDirection, level, isToday,
}: {
  entry: DailyEntry;
  beachDirection: number;
  level: Level | null;
  isToday: boolean;
}) {
  const windCond = getWindCondition(entry.noonWindDir, beachDirection);
  const score    = getDailyScore(entry, beachDirection, level);
  const starsN   = scoreToStars(score);
  const sc       = scoreColor(score);
  const wc       = windColor(windCond);

  const d = new Date(`${entry.date}T12:00:00`);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <View style={[styles.dayRow, isToday && styles.dayRowToday]}>
      {/* 日付・曜日 */}
      <View style={styles.colDate}>
        {isToday && <Text style={styles.todayBadge}>今日</Text>}
        <Text style={[styles.dayDate, isToday && { color: C.teal }]}>{dateStr}</Text>
        <Text style={styles.dayDow}>{entry.dayLabel}</Text>
      </View>

      {/* 波高・周期 */}
      <View style={styles.colWave}>
        <Text style={styles.dayWaveH}>{entry.maxWaveHeight.toFixed(1)}m</Text>
        <Text style={styles.dayPeriod}>{Math.round(entry.maxWavePeriod)}s</Text>
      </View>

      {/* 風 */}
      <View style={styles.colWind}>
        <Text style={[styles.dayWindLabel, { color: wc }]} numberOfLines={1}>
          {windLabel(windCond, entry.noonWindDir)}
        </Text>
        <Text style={styles.dayWindSpeed}>{entry.avgWindSpeed.toFixed(1)}m/s</Text>
      </View>

      {/* 星・天気 */}
      <View style={styles.colScore}>
        <Text style={[styles.dayStars, { color: sc }]}>{starsStr(starsN)}</Text>
        <Text style={styles.dayWeather}>{weatherEmoji(entry.weatherCode)}</Text>
      </View>
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
  logoRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  logo:     { fontSize: 22, fontWeight: '900', color: C.teal, letterSpacing: 1 },
  logoBeta: { fontSize: 11, fontWeight: '700', color: C.muted },
  headerPills: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  areaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.tealBg, borderRadius: 20,
    borderWidth: 1, borderColor: C.tealBorder,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  areaPillText: { fontSize: 13, fontWeight: '700', color: C.teal },
  areaPillChev: { fontSize: 11, color: C.teal },
  spotPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  spotPillText: { fontSize: 12, fontWeight: '600', color: C.textSoft },
  spotPillChev: { fontSize: 11, color: C.muted },

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

  // カラムヘッダー
  colHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingTop: 12, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  colHeaderText: { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 0.5 },

  // カラム幅（DayRow / colHeader で共用）
  colDate:  { width: 50 },
  colWave:  { flex: 1, paddingLeft: 4 },
  colWind:  { flex: 1.2, paddingLeft: 4 },
  colScore: { width: 58, alignItems: 'flex-end' },

  // 日別行
  dayRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  dayRowToday: {
    backgroundColor: 'rgba(45,212,191,0.06)',
    borderLeftWidth: 2, borderLeftColor: C.teal,
  },
  todayBadge: {
    fontSize: 8, fontWeight: '800', color: C.teal,
    letterSpacing: 0.5, marginBottom: 1,
  },
  dayDate:      { fontSize: 13, fontWeight: '700', color: C.text },
  dayDow:       { fontSize: 11, color: C.muted, marginTop: 1 },
  dayWaveH:     { fontSize: 15, fontWeight: '800', color: C.text },
  dayPeriod:    { fontSize: 11, color: C.textSoft, marginTop: 1 },
  dayWindLabel: { fontSize: 11, fontWeight: '600' },
  dayWindSpeed: { fontSize: 11, color: C.textSoft, marginTop: 1 },
  dayStars:     { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  dayWeather:   { fontSize: 13, marginTop: 2 },

  // モーダル（エリア・スポット共通）
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
