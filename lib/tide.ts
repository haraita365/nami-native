/**
 * Simplified M2 tidal approximation for the 一宮・志田下 coast (Chiba, Pacific).
 * Calibrated to approximate Katsuura (勝浦) tidal station patterns.
 *
 * ⚠️ 参考値 — 誤差: 時刻 ±1〜2時間、高さ ±20cm 程度
 * 正確な潮汐情報は気象庁または日本水路協会の潮位表をご参照ください。
 */

export interface TideEvent {
  time: Date;
  type: 'high' | 'low';
  heightCm: number;
}

const M2_PERIOD_MS = 12.4206 * 3600 * 1000; // lunar semidiurnal period (ms)

// Reference high water: calibrated for spring tide near 2026-05-27 new moon
// Roughly matches published tables for Katsuura (勝浦) area
const REF_HIGH = new Date('2026-05-26T06:12:00+09:00');

// Phase offsets relative to Katsuura (勝浦) base calibration
// Source: JMA tidal station comparison data (approximate)
const AREA_PHASE_OFFSET_MS: Record<string, number> = {
  '千葉北': 0,
  '千葉南': 10 * 60 * 1000,    // +10 min
  '湘南':   25 * 60 * 1000,    // +25 min
  '茨城':   -15 * 60 * 1000,   // -15 min (大洗基準)
  '伊豆':   35 * 60 * 1000,    // +35 min (下田基準)
  '静岡':   -50 * 60 * 1000,   // -50 min (御前崎基準)
};

// Lunar cycle parameters for spring/neap amplitude variation
const LUNAR_CYCLE_MS = 29.530589 * 86_400_000;
const REF_NEW_MOON    = new Date('2026-05-27T08:00:00+09:00');

const MEAN_CM        = 85; // cm above datum (approx MSL for this coast)
const BASE_AMP_CM    = 55; // base tidal amplitude
const SPRING_EXTRA_CM = 28; // extra cm at spring tide (new / full moon)

function amplitude(t: Date): number {
  const age =
    ((t.getTime() - REF_NEW_MOON.getTime()) % LUNAR_CYCLE_MS + LUNAR_CYCLE_MS) %
    LUNAR_CYCLE_MS;
  const phase = age / LUNAR_CYCLE_MS; // 0 = new, 0.5 = full
  // cos(4π·phase) = +1 at new/full (spring), −1 at quarters (neap)
  return BASE_AMP_CM + SPRING_EXTRA_CM * Math.cos(4 * Math.PI * phase);
}

/** Tide height in cm at a given instant */
export function tideHeightAt(t: Date, area = '千葉北'): number {
  const offset = AREA_PHASE_OFFSET_MS[area] ?? 0;
  const ref = new Date(REF_HIGH.getTime() - offset);
  const angle = (2 * Math.PI * (t.getTime() - ref.getTime())) / M2_PERIOD_MS;
  return Math.round(MEAN_CM + amplitude(t) * Math.cos(angle));
}

/** High / Low water events that fall on the given calendar day */
export function getDayTides(date: Date, area = '千葉北'): TideEvent[] {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  const dayStart = new Date(y, m, d, 0, 0, 0).getTime();
  const dayEnd   = new Date(y, m, d, 23, 59, 59).getTime();

  const halfPeriod     = M2_PERIOD_MS / 2;
  const offset = AREA_PHASE_OFFSET_MS[area] ?? 0;
  const ref = new Date(REF_HIGH.getTime() - offset);
  const halfsSinceRef  = Math.floor((dayStart - ref.getTime()) / halfPeriod);

  const events: TideEvent[] = [];

  for (let n = halfsSinceRef - 1; n <= halfsSinceRef + 7; n++) {
    const ms = ref.getTime() + n * halfPeriod;
    if (ms < dayStart || ms > dayEnd) continue;
    const t = new Date(ms);
    const isHigh = n % 2 === 0;
    const amp = amplitude(t);
    events.push({
      time: t,
      type: isHigh ? 'high' : 'low',
      heightCm: Math.round(MEAN_CM + amp * (isHigh ? 1 : -1)),
    });
  }

  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * Build an SVG polyline path for a smooth 24-hour tide curve.
 * Samples every 20 minutes (72 points).
 * Returns { line, area } for stroke + fill paths in a 360×76 viewBox.
 */
export function buildTideSvgPath(
  date: Date,
  spotArea = '千葉北'
): { line: string; area: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  const pts: { x: number; y: number }[] = [];
  const STEPS = 72; // 72 × 20min = 24h

  // Determine min/max height for the day to normalise the curve
  let minH = Infinity, maxH = -Infinity;
  for (let i = 0; i <= STEPS; i++) {
    const h = tideHeightAt(new Date(y, m, d, 0, i * 20, 0), spotArea);
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }
  const range = maxH - minH || 1;

  for (let i = 0; i <= STEPS; i++) {
    const t = new Date(y, m, d, 0, i * 20, 0);
    const h = tideHeightAt(t, spotArea);
    pts.push({
      x: parseFloat(((i / STEPS) * 360).toFixed(1)),
      y: parseFloat((10 + (1 - (h - minH) / range) * 55).toFixed(1)), // 10–65 px
    });
  }

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L360,76 L0,76 Z`;
  return { line, area };
}

/** Format a Date as HH:MM (local time) */
export function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
