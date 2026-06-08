export type Level = 'beginner' | 'intermediate' | 'advanced';

export const LEVEL_KEY = 'nami:level';

export const LEVEL_LABEL: Record<Level, string> = {
  beginner:     '初級',
  intermediate: '中級',
  advanced:     '上級',
};

// 適性ランク (0=◎, 1=○, 2=△, null=荒天で判定不可)
// alert.ts の danger 閾値（波高3.5m超 or 風速15m/s超）と揃える
export function getAptitude(
  waveHeight: number,
  wavePeriod: number,
  windCond: 'offshore' | 'side' | 'onshore',
  windSpeed: number,
  level: Level
): '◎' | '○' | '△' | null {
  if (waveHeight >= 3.5 || windSpeed >= 15) return null;

  // 波高による基本ランク
  let rank: number;
  if (level === 'beginner') {
    rank = waveHeight <= 0.8 ? 0 : waveHeight <= 1.2 ? 1 : 2;
  } else if (level === 'intermediate') {
    rank = (waveHeight >= 0.8 && waveHeight <= 1.5) ? 0
         : ((waveHeight >= 0.5 && waveHeight < 0.8) || (waveHeight > 1.5 && waveHeight <= 2.0)) ? 1
         : 2;
  } else {
    rank = waveHeight >= 1.5 ? 0 : waveHeight >= 0.8 ? 1 : 2;
  }

  // 長周期補正（10秒以上: パワー増大）
  if (wavePeriod >= 10) {
    if (level === 'beginner') rank = Math.min(2, rank + 1);
    if (level === 'advanced' && waveHeight >= 1.5) rank = Math.max(0, rank - 1);
  }

  // 強いオンショア補正
  if (windCond === 'onshore') rank = Math.min(2, rank + 1);

  return rank === 0 ? '◎' : rank === 1 ? '○' : '△';
}

export function aptStyle(apt: '◎' | '○' | '△'): {
  color: string; background: string; border: string;
} {
  if (apt === '◎') return {
    color: '#2DD4BF',
    background: 'rgba(45,212,191,0.12)',
    border: '1px solid rgba(45,212,191,0.30)',
  };
  if (apt === '○') return {
    color: '#FAB347',
    background: 'rgba(250,179,71,0.12)',
    border: '1px solid rgba(250,179,71,0.30)',
  };
  return {
    color: 'rgba(240,244,248,0.40)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
  };
}
