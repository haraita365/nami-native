export function getWindCondition(
  windDirection: number,
  beachDirection: number
): 'offshore' | 'side' | 'onshore' {
  const offshoreDirection = (beachDirection + 180) % 360;
  let diff = Math.abs(windDirection - offshoreDirection);
  if (diff > 180) diff = 360 - diff;

  if (diff <= 45) return 'offshore';
  if (diff <= 90) return 'side';
  return 'onshore';
}

export function getWindLabel(condition: 'offshore' | 'side' | 'onshore'): string {
  switch (condition) {
    case 'offshore': return 'オフショア';
    case 'side': return 'サイドショア';
    case 'onshore': return 'オンショア';
  }
}

export function getWindBadgeClass(condition: 'offshore' | 'side' | 'onshore'): string {
  switch (condition) {
    case 'offshore': return 'wb-off';
    case 'side': return 'wb-side';
    case 'onshore': return 'wb-on';
  }
}

export function getWindConditionLabel(condition: 'offshore' | 'side' | 'onshore'): string {
  switch (condition) {
    case 'offshore': return 'オフ◎';
    case 'side': return 'サイド△';
    case 'onshore': return 'オン✕';
  }
}

// Convert wind direction degrees to compass label (Japanese)
export function getDirectionLabel(degrees: number): string {
  const dirs = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
  const idx = Math.round(degrees / 22.5) % 16;
  return dirs[idx];
}
