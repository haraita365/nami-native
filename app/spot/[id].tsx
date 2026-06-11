import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path, Line, Circle, Polygon } from 'react-native-svg';
import { SPOTS } from '@/lib/spots';
import { fetchSpotDataFull, getCurrentSlot, nowJST, getTodaySlots } from '@/lib/api';
import type { DailyEntry } from '@/lib/api';
import { getWindCondition, getDirectionLabel } from '@/lib/wind';
import { formatWaveRange, getWaveSizeRangeLabel, getWaveSizeLabel, getConfidenceStars } from '@/lib/wave';
import { scoreSlot, scoreDailyEntry } from '@/lib/scoring';
import { computeSimpleLevelScore } from '@/lib/levelScore';
import { getAptitude } from '@/lib/level';
import { useLevel } from '@/lib/useLevel';
import { buildTideSvgPath, getDayTides, fmtTime } from '@/lib/tide';

// ── ヘルパー ─────────────────────────────────────────────────────────
function stars(n: number): string {
  const c = Math.max(0, Math.min(5, n));
  return '★'.repeat(c) + '☆'.repeat(5 - c);
}
function formatDelta(d: number): string {
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}m`;
}
function deltaColor(d: number): string {
  if (d > 0.05) return '#F97316';
  if (d < -0.05) return C.blue;
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
function weatherEmoji(code: number): string {
  if (code === 0)  return '☀️';
  if (code <= 3)   return '⛅';
  if (code <= 48)  return '🌫';
  if (code <= 67)  return '🌧';
  if (code <= 77)  return '❄️';
  if (code <= 82)  return '🌦';
  if (code <= 99)  return '⛈';
  return '—';
}
function getDailyScore(entry: DailyEntry, beachDirection: number): number {
  return scoreDailyEntry(entry, beachDirection);
}
function verdictHeadline(score: number): string {
  if (score >= 70) return '今日は狙い目';
  if (score >= 50) return 'まずまずのコンディション';
  if (score >= 30) return '物足りないかもしれません';
  return 'コンディション不良';
}
function verdictSub(cond: 'offshore' | 'side' | 'onshore', wh: number): string {
  if (cond === 'offshore') return wh >= 1.0 ? '波面クリーン・狙い目のコンディション' : '風は良好、もう少し波が欲しい';
  if (cond === 'side')     return 'サイド寄り・波のコンディションは標準的';
  return '面荒れ気味・状況次第で判断を';
}
function getSeasonalSST(): number {
  const m = new Date().getMonth();
  return ([14,13,14,17,20,23,26,28,27,23,20,16] as const)[m] ?? 20;
}
function getWetsuitLabel(temp: number): string {
  if (temp >= 25) return 'トランクスOK';
  if (temp >= 22) return '春ウェット可';
  if (temp >= 18) return '3/2mm推奨';
  if (temp >= 15) return 'フルスーツ必須';
  return 'ドライスーツ推奨';
}
function fmtDayLabel(dateStr: string): { dow: string; day: string } {
  const d = new Date(dateStr + 'T12:00:00+09:00');
  const dows = ['日','月','火','水','木','金','土'];
  return { dow: dows[d.getDay()] ?? '', day: String(d.getDate()) };
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
    retry: (failureCount, error) => {
      if ((error as Error)?.message?.includes('429')) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
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

  const { slots, daily, waveHeightDelta } = data;
  const current = getCurrentSlot(slots);
  const { hour, date: todayStr } = nowJST();

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

  const sst = current.seaSurfaceTemp ?? getSeasonalSST();
  const headline = verdictHeadline(displayScore);
  const sub = verdictSub(windCond, current.waveHeight);

  const levelNote = level && apt
    ? `※このスコアは${level}向けレベルの目安です`
    : null;

  // 週間予報（今日より後の7日分）
  const weeklyEntries = daily.filter((d) => d.date > todayStr).slice(0, 7);

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
              <Text style={styles.heroScoreLabel}>スコア</Text>
              <Text style={[styles.heroScore, { color: sc }]}>{displayScore}</Text>
              <Text style={[styles.heroStars, { color: sc }]}>{stars(displayStars)}</Text>
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

          <View style={styles.verdictBlock}>
            <Text style={[styles.verdictHeadline, { color: sc }]}>{headline}</Text>
            <Text style={styles.verdictSub}>{sub}</Text>
          </View>

          {levelNote && (
            <Text style={styles.levelNote}>{levelNote}</Text>
          )}
        </View>

        {/* ── 波・気象スタッツ 2×2 ─────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>現在の波況</Text>
          <View style={styles.statQuad}>
            {/* 波高 */}
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>波高</Text>
              <Text style={styles.statValue}>{current.waveHeight.toFixed(1)}m</Text>
              <Text style={styles.statSub}>{getWaveSizeRangeLabel(current.waveHeightMin, current.waveHeightMax)}</Text>
              {waveHeightDelta != null && (
                <Text style={[styles.statDelta, { color: deltaColor(waveHeightDelta) }]}>
                  昨日比 {formatDelta(waveHeightDelta)}
                </Text>
              )}
            </View>
            {/* 周期 */}
            <View style={[styles.statCell, styles.statCellRight]}>
              <Text style={styles.statLabel}>周期</Text>
              <Text style={styles.statValue}>{Math.round(current.wavePeriod)}秒</Text>
              <Text style={styles.statSub}>{periodQuality(current.wavePeriod)}</Text>
            </View>
            {/* 信頼度 */}
            <View style={[styles.statCell, styles.statCellTop]}>
              <Text style={styles.statLabel}>信頼度</Text>
              <Text style={[
                styles.statValue,
                { color: conf === '高' ? C.teal : conf === '中' ? '#FAB347' : C.muted },
              ]}>
                {conf}
              </Text>
              <Text style={styles.statSub}>{current.waveModelCount}モデル</Text>
            </View>
            {/* 水温 */}
            <View style={[styles.statCell, styles.statCellRight, styles.statCellTop]}>
              <Text style={styles.statLabel}>水温</Text>
              <Text style={[styles.statValue, { color: C.blue }]}>{sst.toFixed(0)}℃</Text>
              <Text style={styles.statSub}>{getWetsuitLabel(sst)}</Text>
            </View>
          </View>
        </View>

        {/* ── 風・うねり詳細 ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>風・うねり詳細</Text>

          <View style={styles.windCompassRow}>
            <WindCompass deg={current.windDirection} color={wc} />
            <View style={styles.windCompassMeta}>
              <Text style={[styles.windCompassDir, { color: wc }]}>{windDir}</Text>
              <Text style={styles.windCompassSpeed}>{current.windSpeed.toFixed(1)} m/s</Text>
              <Text style={[styles.windCompassCond, { color: wc }]}>
                {windCond === 'offshore' ? 'オフショア ◎' :
                 windCond === 'side'     ? 'サイドショア △' : 'オンショア ✕'}
              </Text>
            </View>
          </View>

          <View style={styles.infoTable}>
            <InfoRow label="ビーチの向き" value={`${beachDir}向き`} />
            <InfoRow label="うねり方向"   value={waveDir} />
            {current.swellHeight > 0.2 && (
              <InfoRow label="スウェル" value={`${current.swellHeight.toFixed(1)}m  周期${Math.round(current.swellPeriod)}s`} />
            )}
          </View>
        </View>

        {/* ── 波高推移チャート ─────────────────────────── */}
        <WaveChart slots={slots} beachDirection={spot.beachDirection} />

        {/* ── 潮位グラフ ─────────────────────────────── */}
        <TideChart area={spot.area} />

        {/* ── 週間予報 ──────────────────────────────── */}
        {weeklyEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>週間予報（翌日〜7日間）</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyScroll}>
              <View style={styles.weeklyRow}>
                {weeklyEntries.map((entry) => {
                  const { dow, day } = fmtDayLabel(entry.date);
                  const sc2 = scoreColor(getDailyScore(entry, spot.beachDirection));
                  const wc2 = getWindCondition(entry.noonWindDir, spot.beachDirection);
                  return (
                    <View key={entry.date} style={styles.weeklyCard}>
                      <Text style={styles.weeklyDow}>{dow}</Text>
                      <Text style={styles.weeklyDay}>{day}</Text>
                      <Text style={styles.weeklyEmoji}>{weatherEmoji(entry.weatherCode)}</Text>
                      <Text style={[styles.weeklyWave, { color: sc2 }]}>
                        {entry.maxWaveHeight.toFixed(1)}m
                      </Text>
                      <Text style={styles.weeklySize}>
                        {getWaveSizeLabel(entry.maxWaveHeight)}
                      </Text>
                      <View style={[styles.weeklyWindDot, { backgroundColor: windColor(wc2) }]} />
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 小コンポーネント ──────────────────────────────────────────────
const WAVE_XS = [0, 52, 103, 154, 205, 256, 308];
const WAVE_SLOT_HRS = [6, 9, 12, 15, 18, 21, 24];

function WindCompass({ deg, color }: { deg: number; color: string }) {
  const cx = 24, cy = 24, r = 18;
  const rad = ((deg - 90) * Math.PI) / 180;
  const tipX = cx + r * Math.cos(rad);
  const tipY = cy + r * Math.sin(rad);
  const perp = { x: Math.sin(rad) * 5, y: -Math.cos(rad) * 5 };
  const pts = `${tipX},${tipY} ${cx - perp.x},${cy - perp.y} ${cx + perp.x},${cy + perp.y}`;
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={1} fill="none" />
      <Line x1={cx} y1={cy - r + 3} x2={cx} y2={cy + r - 3} stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
      <Line x1={cx - r + 3} y1={cy} x2={cx + r - 3} y2={cy} stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
      <Polygon points={pts} fill={color} />
    </Svg>
  );
}

function WaveChart({ slots, beachDirection }: { slots: import('@/lib/api').HourlySlot[]; beachDirection: number }) {
  const todaySlots = getTodaySlots(slots);
  if (todaySlots.length === 0) return null;

  const midH = todaySlots.map((s) => s.waveHeight);
  const maxH = Math.max(2.0, ...midH);
  const toY  = (h: number) => Math.max(8, Math.min(82, 90 - (h / maxH) * 72));

  const midPts = midH.map((h, i) => ({ x: WAVE_XS[i] ?? 308, y: toY(h) }));
  const midLine = midPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  // 最高スコアのスロットを BEST マーク
  const scores = todaySlots.map((s) => scoreSlot(s, beachDirection));
  const bestIdx = scores.indexOf(Math.max(...scores));
  const bestPt = midPts[bestIdx];

  // 現在時刻 x
  const { hour: nowHour } = nowJST();
  const h24 = nowHour < 6 ? null : nowHour;
  let nowX: number | null = null;
  if (h24 !== null) {
    for (let i = 0; i < WAVE_SLOT_HRS.length - 1; i++) {
      if (h24 >= WAVE_SLOT_HRS[i] && h24 < WAVE_SLOT_HRS[i + 1]) {
        const span = WAVE_SLOT_HRS[i + 1] - WAVE_SLOT_HRS[i];
        nowX = WAVE_XS[i] + ((h24 - WAVE_SLOT_HRS[i]) / span) * ((WAVE_XS[i + 1] ?? 308) - WAVE_XS[i]);
        break;
      }
    }
  }

  const gridLevels = [0.5, 1.0, 1.5].filter((gl) => gl < maxH);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>波高推移（今日）</Text>
      <Svg width="100%" height={105} viewBox="0 0 308 105" preserveAspectRatio="none">
        {gridLevels.map((gl) => (
          <Line key={gl}
            x1={0} y1={toY(gl)} x2={308} y2={toY(gl)}
            stroke="rgba(255,255,255,0.07)" strokeWidth={1}
          />
        ))}
        {/* single blue line (Web-parity: no min-max band) */}
        <Path d={midLine} fill="none" stroke={C.blue} strokeWidth={2.5} />
        {/* dots at each slot */}
        {midPts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={C.blue} />
        ))}
        {/* NOW line */}
        {nowX !== null && (
          <Line
            x1={nowX} y1={0} x2={nowX} y2={90}
            stroke="rgba(249,115,22,0.85)" strokeWidth={1.5} strokeDasharray="3,3"
          />
        )}
        {/* BEST marker */}
        {bestPt && (
          <>
            <Circle cx={bestPt.x} cy={bestPt.y} r={5} fill={C.teal} />
          </>
        )}
      </Svg>

      {/* タイムバー行 */}
      <View style={styles.waveTimeRow}>
        {['6時', '9時', '12時', '15時', '18時', '21時', '翌0時'].map((l, i) => {
          const h = midH[i] ?? 0;
          const isBest = i === bestIdx;
          return (
            <View key={l} style={styles.waveTimeCell}>
              <Text style={[styles.waveTimeVal, isBest && { color: C.teal }]}>
                {h.toFixed(1)}m
              </Text>
              <View style={[
                styles.waveTimebar,
                { height: Math.max(4, Math.round((h / maxH) * 24)), backgroundColor: isBest ? C.teal : C.blue },
              ]} />
              <Text style={[styles.waveTimeLabel, isBest && { color: C.teal }]}>
                {isBest ? '★' : l}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TideChart({ area }: { area: string }) {
  const now = new Date();
  const { line, area: fillPath } = buildTideSvgPath(now, area);
  const events = getDayTides(now, area);
  const nowX = parseFloat(
    (((now.getHours() * 60 + now.getMinutes()) / 1440) * 360).toFixed(1),
  );

  return (
    <View style={styles.card}>
      <View style={styles.tideHeader}>
        <Text style={styles.cardTitle}>潮位グラフ</Text>
        <Text style={styles.tideNote}>※概算値（±1〜2h・±20cm）</Text>
      </View>
      <Svg width="100%" height={80} viewBox="0 0 360 76" preserveAspectRatio="none">
        <Path d={fillPath} fill="rgba(45,212,191,0.08)" />
        <Path d={line} fill="none" stroke={C.teal} strokeWidth={2} />
        <Line
          x1={nowX} y1={0} x2={nowX} y2={76}
          stroke="rgba(249,115,22,0.85)" strokeWidth={1.5} strokeDasharray="3,3"
        />
        {events.map((ev, i) => {
          const ex = parseFloat(
            (((ev.time.getHours() * 60 + ev.time.getMinutes()) / 1440) * 360).toFixed(1),
          );
          const ey = ev.type === 'high' ? 10 : 65;
          return (
            <Circle
              key={i} cx={ex} cy={ey} r={3.5}
              fill={ev.type === 'high' ? '#FAB347' : '#F088A8'}
            />
          );
        })}
      </Svg>
      <View style={styles.tideTimeRow}>
        {['0時', '6時', '12時', '18時', '24時'].map((h) => (
          <Text key={h} style={styles.tideTimeLabel}>{h}</Text>
        ))}
      </View>
      {events.length > 0 && (
        <View style={styles.tideEventRow}>
          {events.map((ev, i) => (
            <View key={i} style={styles.tideEventChip}>
              <Text style={[styles.tideEventType, { color: ev.type === 'high' ? '#FAB347' : '#F088A8' }]}>
                {ev.type === 'high' ? '▲ 満潮' : '▼ 干潮'}
              </Text>
              <Text style={styles.tideEventMeta}>{fmtTime(ev.time)}  {ev.heightCm}cm</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

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
  scroll:    { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

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
  heroTopRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroScoreLabel:  { fontSize: 11, color: C.muted, fontWeight: '600', letterSpacing: 1 },
  heroScore:       { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  heroStars:       { fontSize: 16, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  windCondBanner:  {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  windCondText:    { fontSize: 13, fontWeight: '700' },

  verdictBlock:    { gap: 3 },
  verdictHeadline: { fontSize: 16, fontWeight: '800' },
  verdictSub:      { fontSize: 13, color: C.textSoft },
  levelNote:       { fontSize: 11, color: C.muted, fontStyle: 'italic' } as const,

  // apt バッジ
  aptBadge:     { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  aptBadgeText: { fontSize: 18, fontWeight: '800' },

  // 共通カード
  card: {
    backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.text },

  // スタッツ 2×2
  statQuad: { flexDirection: 'row', flexWrap: 'wrap' },
  statCell: {
    width: '50%',
    paddingRight: 12,
    paddingBottom: 12,
    gap: 3,
  },
  statCellRight: { paddingRight: 0, paddingLeft: 12 },
  statCellTop:   { borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 12, paddingBottom: 0 },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', color: C.text },
  statSub:   { fontSize: 11, color: C.textSoft },
  statDelta: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // 風コンパスエリア
  windCompassRow:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  windCompassMeta:  { gap: 3 },
  windCompassDir:   { fontSize: 16, fontWeight: '800' },
  windCompassSpeed: { fontSize: 13, color: C.textSoft },
  windCompassCond:  { fontSize: 13, fontWeight: '700' },

  // 潮位グラフ
  tideHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tideNote:      { fontSize: 10, color: C.muted },
  tideTimeRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  tideTimeLabel: { fontSize: 9, color: C.muted },
  tideEventRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  tideEventChip: { gap: 2 },
  tideEventType: { fontSize: 11, fontWeight: '700' as const },
  tideEventMeta: { fontSize: 11, color: C.textSoft },

  // 波高チャート タイムバー
  waveTimeRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  waveTimeCell: { alignItems: 'center', gap: 3, flex: 1 },
  waveTimeVal:  { fontSize: 8, color: C.muted },
  waveTimebar:  { width: 10, borderRadius: 2 },
  waveTimeLabel: { fontSize: 8, color: C.muted },

  // 週間予報
  weeklyScroll: { marginHorizontal: -4 },
  weeklyRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  weeklyCard:   {
    alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
    minWidth: 64,
  },
  weeklyDow:     { fontSize: 11, color: C.muted, fontWeight: '600' },
  weeklyDay:     { fontSize: 16, fontWeight: '800', color: C.text },
  weeklyEmoji:   { fontSize: 18 },
  weeklyWave:    { fontSize: 14, fontWeight: '700' },
  weeklySize:    { fontSize: 10, color: C.textSoft },
  weeklyWindDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },

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
