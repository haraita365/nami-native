import { HourlySlot, DailyEntry } from './api';
import { getWindCondition } from './wind';

export interface ScoredSlot extends HourlySlot {
  score: number;
}

// How directly the swell hits the beach (0-15 pts)
// beachDirection = direction beach faces toward the sea
// swellDirection = direction swell is coming FROM
// Optimal: swellDir ≈ beachDir (swell coming straight at the beach)
export function getSwellAlignment(swellDir: number, swellHeight: number, beachDir: number): number {
  if (swellHeight < 0.2) return 0;
  let diff = Math.abs(swellDir - beachDir);
  if (diff > 180) diff = 360 - diff;
  // diff=0 → direct hit (perfect), diff=180 → from behind (no waves)
  if (diff <= 30) return 15;
  if (diff <= 60) return 8;
  if (diff <= 90) return 3;
  return 0;
}

export function getSwellAlignmentLabel(swellDir: number, swellHeight: number, beachDir: number): string {
  if (swellHeight < 0.2) return 'うねりなし';
  let diff = Math.abs(swellDir - beachDir);
  if (diff > 180) diff = 360 - diff;
  if (diff <= 30) return '直打ち ◎';
  if (diff <= 60) return 'やや斜め ○';
  if (diff <= 90) return '斜め △';
  return '向き悪 ✕';
}

export function scoreSlot(slot: HourlySlot, beachDirection: number): number {
  let score = 0;

  // Wave height: ideal 0.8–1.5m (25 pts)
  if (slot.waveHeight >= 0.8 && slot.waveHeight <= 1.5) score += 25;
  else if (slot.waveHeight > 1.5) score += 8;
  else if (slot.waveHeight >= 0.5) score += 12;

  // Wind condition (35 pts)
  const cond = getWindCondition(slot.windDirection, beachDirection);
  if (cond === 'offshore') score += 35;
  else if (cond === 'side') score += 12;

  // Wave period (15 pts)
  if (slot.wavePeriod >= 10) score += 15;
  else if (slot.wavePeriod >= 8) score += 8;

  // Swell alignment with beach (0-15 pts)
  score += getSwellAlignment(slot.swellDirection, slot.swellHeight, beachDirection);

  // Long-period swell quality bonus (10 pts)
  if (slot.swellHeight > 0.3) {
    if (slot.swellPeriod >= 12) score += 10;
    else if (slot.swellPeriod >= 9) score += 5;
  }

  // Morning bonus (5 pts)
  if (slot.hour >= 5 && slot.hour <= 9) score += 5;

  return Math.min(100, score);
}

export function getBestSlot(slots: HourlySlot[], beachDirection: number): HourlySlot {
  if (slots.length === 0) throw new Error('No slots');
  return slots.reduce((best, s) =>
    scoreSlot(s, beachDirection) > scoreSlot(best, beachDirection) ? s : best
  );
}

export function getVerdictText(slot: HourlySlot, beachDirection: number): { headline: string; sub: string } {
  const cond = getWindCondition(slot.windDirection, beachDirection);
  const h = slot.waveHeight;

  if (h < 0.3) {
    return {
      headline: '今日は <em>難しい</em>\nフラットで波なし',
      sub: '波がほとんどない状態。ビーチ散歩や陸トレが◎',
    };
  }
  if (cond === 'offshore') {
    return {
      headline: `今日は <em>入れる</em>\n${getWaveSizeShort(h)}のコンディション`,
      sub: 'オフショアで波面クリーン。狙い目のコンディション。',
    };
  }
  if (cond === 'side') {
    return {
      headline: `今日は <em>まあまあ</em>\n${getWaveSizeShort(h)}・サイド風`,
      sub: 'サイドショアで波面やや乱れ気味。経験者向け。',
    };
  }
  return {
    headline: `今日は <em>厳しい</em>\n${getWaveSizeShort(h)}・オンショア`,
    sub: 'オンショアで波面が荒れ気味。上級者向けのコンディション。',
  };
}

function getWaveSizeShort(m: number): string {
  if (m < 0.5) return 'スネ〜モモ';
  if (m < 0.7) return 'モモ〜コシ';
  if (m < 1.0) return 'コシ〜ムネ';
  if (m < 1.3) return 'ムネ〜カタ';
  if (m < 1.6) return 'カタ〜アタマ';
  return 'アタマ以上';
}

/** 日別エントリのスコアを計算（ホーム・16日間タブで共有） */
export function scoreDailyEntry(entry: DailyEntry, beachDirection: number): number {
  const wc = getWindCondition(entry.noonWindDir, beachDirection);
  const windBonus = wc === 'offshore' ? 30 : wc === 'side' ? 10 : 0;
  // Ideal range 0.8–2.0m; oversized (>2.0m) is penalized — mirrors hourly scoreSlot logic
  const h = entry.maxWaveHeight;
  const waveScore = h >= 0.8 && h <= 2.0
    ? Math.min(40, (h / 2.0) * 40)
    : h > 2.0 ? 10 : h >= 0.5 ? 15 : 0;
  const periodBonus = entry.maxWavePeriod >= 10 ? 15 : entry.maxWavePeriod >= 8 ? 8 : 0;
  const swellBonus = getSwellAlignment(entry.noonSwellDir, entry.noonSwellHeight, beachDirection);
  return waveScore + windBonus + periodBonus + swellBonus;
}

/** afterDate（YYYY-MM-DD）より後の最大7日間でベストデーを返す */
export function getBestDailyEntry(
  daily: DailyEntry[],
  afterDate: string,
  beachDirection: number
): DailyEntry | null {
  const candidates = daily.filter((d) => d.date > afterDate).slice(0, 7);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, d) =>
    scoreDailyEntry(d, beachDirection) > scoreDailyEntry(best, beachDirection) ? d : best
  );
}

export function buildChartPath(heights: number[]): { line: string; area: string; bestIdx: number } {
  const maxH = Math.max(2.0, ...heights);
  const xs = [0, 52, 103, 154, 205, 256, 308];
  const pts = heights.map((h, i) => ({
    x: xs[i] ?? 308,
    y: Math.max(8, Math.min(82, 90 - (h / maxH) * 72)),
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = line + ' L308,90 L0,90 Z';
  const bestIdx = heights.indexOf(Math.max(...heights));
  return { line, area, bestIdx };
}
