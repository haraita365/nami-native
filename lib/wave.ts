export function getWaveSizeLabel(meters: number): string {
  if (meters < 0.3) return 'フラット';
  if (meters < 0.5) return 'スネ〜モモ';
  if (meters < 0.7) return 'モモ〜コシ';
  if (meters < 1.0) return 'コシ〜ムネ';
  if (meters < 1.3) return 'ムネ〜カタ';
  if (meters < 1.6) return 'カタ〜アタマ';
  if (meters < 2.0) return 'アタマ〜オーバーヘッド';
  return 'ダブル';
}

export function getWaveScoreColor(meters: number): string {
  if (meters < 0.3) return 'var(--muted)';
  if (meters < 0.7) return 'var(--blue)';
  if (meters < 1.6) return 'var(--accent)';
  return 'var(--amber)';
}

// Returns 0-100 fill percentage for chart bars
export function getWaveBarHeight(meters: number, maxMeters = 2.0): number {
  return Math.min(100, Math.round((meters / maxMeters) * 100));
}

// Format wave height as range string
export function formatWaveRange(min: number, max: number): string {
  const minStr = min.toFixed(1);
  const maxStr = max.toFixed(1);
  if (minStr === maxStr) return `${minStr}m`;
  return `${minStr}〜${maxStr}m`;
}

// Wave size label covering min→max range.
// getWaveSizeLabel returns compound labels like 'コシ〜ムネ', so we extract
// the leading word of lo and trailing word of hi to avoid 'コシ〜ムネ〜ムネ〜カタ'.
export function getWaveSizeRangeLabel(min: number, max: number): string {
  const loFull = getWaveSizeLabel(min);
  const hiFull = getWaveSizeLabel(max);
  if (loFull === hiFull) return loFull;
  const lo = loFull.split('〜')[0] ?? loFull;
  const hi = hiFull.split('〜').at(-1) ?? hiFull;
  return `${lo}〜${hi}`;
}

// Confidence level based on model spread and number of models.
// Returns null when modelCount=0 (daily-only data: no multi-model comparison available).
export function getConfidenceStars(min: number, max: number, modelCount = 3): string | null {
  if (modelCount === 0) return null;
  if (modelCount < 2) return '低';
  const spread = max - min;
  if (spread < 0.30) return '高';
  if (spread < 0.50) return '中';
  return '低';
}

export function getConfidenceLabel(min: number, max: number, modelCount = 3): string | null {
  return getConfidenceStars(min, max, modelCount);
}
