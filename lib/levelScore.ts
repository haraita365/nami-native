import { getAptitude, LEVEL_LABEL, type Level } from './level';
import { getSwellAlignment } from './scoring';

export function isHazardous(waveHeight: number, windSpeed: number): boolean {
  return waveHeight >= 3.5 || windSpeed >= 15;
}

// スコア(0-100) → 星(1-5)
export function scoreToStars(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

// レベル別波高スコア（0-25点）
function waveScore(h: number, level: Level): number {
  if (level === 'beginner') {
    if (h <= 0.5) return 15;
    if (h <= 0.8) return 25;
    if (h <= 1.0) return 12;
    if (h <= 1.2) return 5;
    return 0;
  }
  if (level === 'intermediate') {
    if (h < 0.5) return 5;
    if (h < 0.8) return 15;
    if (h <= 1.5) return 25;
    if (h <= 2.0) return 12;
    return 3;
  }
  // advanced
  if (h < 0.5) return 0;
  if (h < 0.8) return 5;
  if (h < 1.5) return 15;
  if (h <= 2.5) return 25;
  return 18;
}

// レベル別フルスコア（beachDirection必要・スポット詳細用）
export function computeLevelScore(
  waveHeight: number,
  wavePeriod: number,
  windCond: 'offshore' | 'side' | 'onshore',
  windSpeed: number,
  swellDirection: number,
  swellHeight: number,
  swellPeriod: number,
  beachDirection: number,
  hour: number,
  level: Level
): number {
  if (isHazardous(waveHeight, windSpeed)) return 0;
  const apt = getAptitude(waveHeight, wavePeriod, windCond, windSpeed, level);
  if (apt === null) return 0;

  const wind = windCond === 'offshore' ? 35 : windCond === 'side' ? 12 : 0;
  const period = wavePeriod >= 10 ? 15 : wavePeriod >= 8 ? 8 : 0;
  const swell = getSwellAlignment(swellDirection, swellHeight, beachDirection);
  const swellQ = swellHeight > 0.3
    ? swellPeriod >= 12 ? (level === 'advanced' ? 10 : level === 'intermediate' ? 7 : 3) : swellPeriod >= 9 ? 5 : 0
    : 0;
  const morning = hour >= 5 && hour <= 9 ? 5 : 0;
  const periodAdj = level === 'beginner' && wavePeriod >= 10 ? -5 : 0;

  return Math.max(0, Math.min(100,
    waveScore(waveHeight, level) + wind + period + swell + swellQ + morning + periodAdj
  ));
}

// 簡易レベルスコア（beachDirection不要・スポット一覧sort用）
export function computeSimpleLevelScore(
  waveHeight: number,
  wavePeriod: number,
  windCond: 'offshore' | 'side' | 'onshore',
  windSpeed: number,
  level: Level
): number {
  if (isHazardous(waveHeight, windSpeed)) return 0;
  const apt = getAptitude(waveHeight, wavePeriod, windCond, windSpeed, level);
  if (apt === null) return 0;

  const wind = windCond === 'offshore' ? 35 : windCond === 'side' ? 12 : 0;
  const period = wavePeriod >= 10 ? 15 : wavePeriod >= 8 ? 8 : 0;
  const periodAdj = level === 'beginner' && wavePeriod >= 10 ? -5 : 0;

  return Math.max(0, Math.min(100, waveScore(waveHeight, level) + wind + period + periodAdj));
}

// ──────────────────────────────────────────────────────────────────
// レベル別評価テキスト生成
// ──────────────────────────────────────────────────────────────────

function sizeFact(h: number): string {
  if (h < 0.3) return 'フラット';
  if (h < 0.5) return 'スネ〜モモ';
  if (h < 0.7) return 'モモ〜コシ';
  if (h < 1.0) return 'コシ〜ムネ';
  if (h < 1.3) return 'ムネ〜カタ';
  if (h < 1.6) return 'カタ〜アタマ';
  if (h < 2.0) return 'アタマ〜オーバーヘッド';
  return 'ダブル超え';
}

// null を返す = レベル未設定のため一般評価を使う、というシグナル
export function generateLevelVerdict(
  waveHeight: number,
  wavePeriod: number,
  windCond: 'offshore' | 'side' | 'onshore',
  windSpeed: number,
  level: Level | null
): { headline: string; sub: string } | null {
  if (!level) return null;

  if (isHazardous(waveHeight, windSpeed)) {
    return {
      headline: '危険\n入水を見送ってください',
      sub: '波高または風速が危険な水準です。レベルを問わず入水は危険です。',
    };
  }

  const apt = getAptitude(waveHeight, wavePeriod, windCond, windSpeed, level);
  if (apt === null) {
    return {
      headline: '危険\n入水を見送ってください',
      sub: '危険なコンディションです。入水を見送ってください。',
    };
  }

  const ll = LEVEL_LABEL[level];
  const sz = sizeFact(waveHeight);
  const windFact = windCond === 'offshore'
    ? 'オフショアで面はクリーン。'
    : windCond === 'onshore'
    ? 'オンショアで面は荒れ気味。'
    : 'サイドショアで波面やや乱れ。';
  const periodFact = wavePeriod >= 12 ? '長周期でパワーがある。'
    : wavePeriod < 7 ? '周期が短くパワー不足。'
    : '';
  const cond = `${sz}の波。${windFact}${periodFact}`;

  if (apt === '◎') {
    if (level === 'beginner') return {
      headline: `今日は${ll}向き\n入りやすいコンディション`,
      sub: `${cond}${ll}向きの穏やかなサイズです。ゆっくり楽しんでください。`,
    };
    if (level === 'intermediate') return {
      headline: `今日は${ll}向き\n積極的に狙える波`,
      sub: `${cond}${ll}にとってちょうどいいサイズ感です。コンディション良好。`,
    };
    return {
      headline: `今日は${ll}向き\n乗りごたえのある波`,
      sub: `${cond}${ll}向きのパワーがあります。いいセットを選んで入りましょう。`,
    };
  }

  if (apt === '○') {
    if (level === 'beginner' && waveHeight > 0.8) return {
      headline: `今日は${ll}にはやや大きめ\n慎重に判断を`,
      sub: `${cond}${ll}にはやや大きめです。ホワイトウォーターで感覚を確かめてから入水を。`,
    };
    if (level === 'advanced' && waveHeight < 1.5) return {
      headline: `今日はやや物足りないサイズ\n技術練習に向いている`,
      sub: `${cond}${ll}にはやや小さめです。技術確認やトレーニングとして活用を。`,
    };
    if (level === 'intermediate' && waveHeight > 1.5) return {
      headline: `今日は${ll}にはやや大きめ\n余裕を持って判断を`,
      sub: `${cond}${ll}にはやや大きめです。無理をせず安全を優先して。`,
    };
    return {
      headline: `今日は${ll}で楽しめる\n余裕を持って入水を`,
      sub: `${cond}${ll}でも楽しめますが、余裕を持って判断してください。`,
    };
  }

  // △
  if (level === 'beginner') return {
    headline: `今日は${ll}には厳しいサイズ\n見送りを推奨`,
    sub: `${cond}このサイズは${ll}には危険です。安全のため今日は見送りを強くお勧めします。`,
  };
  if (level === 'intermediate' && waveHeight > 2.0) return {
    headline: `今日は${ll}には厳しいサイズ\n無理は禁物`,
    sub: `${cond}かなり大きめのサイズです。${ll}でも無理は禁物。安全最優先で判断を。`,
  };
  if (level === 'advanced' && waveHeight < 0.8) return {
    headline: `今日はやや力不足のコンディション\nトレーニング向き`,
    sub: `${cond}${ll}にはパワー不足気味です。体力維持や動き確認として割り切りましょう。`,
  };
  return {
    headline: `今日は${ll}にはやや厳しいコンディション\n慎重に判断を`,
    sub: `${cond}${ll}のコンディションとしてはやや厳しい状況です。無理をせず判断してください。`,
  };
}
