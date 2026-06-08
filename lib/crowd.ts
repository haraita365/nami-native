export function estimateCrowd(params: {
  baseCrowd: number;
  date: Date;
  waveHeight: number;
  weatherCode: number;
}): number {
  const hour = params.date.getHours();

  // 夜間は入水者ゼロ
  if (hour < 5 || hour >= 21) return 0;

  let crowd = params.baseCrowd;

  const day = params.date.getDay();
  if (day === 0 || day === 6) crowd *= 1.5;

  if (hour >= 5 && hour <= 8) crowd *= 1.3;
  if (hour >= 16 && hour <= 18) crowd *= 1.3;

  if (params.waveHeight >= 0.8 && params.waveHeight <= 1.5) crowd *= 1.4;

  if (params.weatherCode === 0 || params.weatherCode === 1) crowd *= 1.2;

  const month = params.date.getMonth() + 1;
  if (month >= 6 && month <= 9) crowd *= 1.5;

  return Math.round(crowd);
}

export function getCrowdClass(count: number): string {
  if (count === 0) return 'crowd-low';
  if (count <= 15) return 'crowd-low';
  if (count <= 25) return 'crowd-mid';
  return 'crowd-high';
}

export function getCrowdLabel(count: number): string {
  if (count === 0) return '静か';
  if (count <= 15) return '空き';
  if (count <= 25) return 'やや混み';
  return '混雑';
}
