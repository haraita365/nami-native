export const NAMI_FETCH_ERRORS: string[] = [];

export interface RawHourlyData {
  time: string[];
  waveHeight: (number | null)[];
  waveHeightMin: (number | null)[];
  waveHeightMax: (number | null)[];
  waveModelCount: number[];
  wavePeriod: (number | null)[];
  waveDirection: (number | null)[];
  windSpeed: (number | null)[];
  windDirection: (number | null)[];
  temperature: (number | null)[];
  weatherCode: (number | null)[];
  seaSurfaceTemp: (number | null)[];
  swellHeight: (number | null)[];
  swellPeriod: (number | null)[];
  swellDirection: (number | null)[];
}

export interface HourlySlot {
  time: Date;
  jstDate: string;
  hour: number;
  waveHeight: number;
  waveHeightMin: number;
  waveHeightMax: number;
  waveModelCount: number;
  wavePeriod: number;
  waveDirection: number;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  weatherCode: number;
  seaSurfaceTemp: number | null;
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
}

export interface DailyEntry {
  date: string;
  dayLabel: string;
  maxWaveHeight: number;
  maxWaveHeightMin: number;
  maxWaveHeightMax: number;
  maxWaveModelCount: number;
  maxWavePeriod: number;
  avgWindSpeed: number;
  noonWindDir: number;
  noonWaveDir: number;
  noonSwellDir: number;
  noonSwellHeight: number;
  noonSwellPeriod: number;
  weatherCode: number;
}

// Returns current JST date string and hour without relying on server's timezone
export function nowJST(): { date: string; hour: number } {
  const ms = Date.now() + 9 * 60 * 60 * 1000;
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, hour: d.getUTCHours() };
}

// Returns yesterday's JST date string (YYYY-MM-DD)
export function getYesterdayJSTStr(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const safe = (n: number | null | undefined, fallback = 0): number =>
  n != null && !isNaN(n) ? n : fallback;

// Weighted ensemble across models: returns mean, min, max, and count per time step
function weightedEnsemble(
  models: { data: (number | null)[]; weight: number }[]
): { mean: (number | null)[]; min: (number | null)[]; max: (number | null)[]; count: number[] } {
  const active = models.filter((m) => m.data && m.data.length > 0);
  if (active.length === 0) return { mean: [], min: [], max: [], count: [] };
  const len = Math.max(...active.map((m) => m.data.length));
  const mean: (number | null)[] = [];
  const min: (number | null)[] = [];
  const max: (number | null)[] = [];
  const count: number[] = [];

  for (let i = 0; i < len; i++) {
    const valid = active
      .map((m) => ({ v: m.data[i] ?? null, w: m.weight }))
      .filter((x): x is { v: number; w: number } => x.v !== null);
    if (valid.length === 0) {
      mean.push(null); min.push(null); max.push(null); count.push(0);
      continue;
    }
    const tw = valid.reduce((s, x) => s + x.w, 0);
    mean.push(valid.reduce((s, x) => s + x.v * x.w, 0) / tw);
    min.push(Math.min(...valid.map((x) => x.v)));
    max.push(Math.max(...valid.map((x) => x.v)));
    count.push(valid.length);
  }
  return { mean, min, max, count };
}

// Weighted circular mean for direction fields (handles 350°+10° = 0° correctly)
function weightedCircularMean(
  models: { data: (number | null)[]; weight: number }[]
): (number | null)[] {
  const active = models.filter((m) => m.data && m.data.length > 0);
  if (active.length === 0) return [];
  const len = Math.max(...active.map((m) => m.data.length));
  const toRad = (d: number) => (d * Math.PI) / 180;

  return Array.from({ length: len }, (_, i) => {
    const valid = active
      .map((m) => ({ v: m.data[i] ?? null, w: m.weight }))
      .filter((x): x is { v: number; w: number } => x.v !== null);
    if (valid.length === 0) return null;
    const tw = valid.reduce((s, x) => s + x.w, 0);
    const sinM = valid.reduce((s, x) => s + Math.sin(toRad(x.v)) * x.w, 0) / tw;
    const cosM = valid.reduce((s, x) => s + Math.cos(toRad(x.v)) * x.w, 0) / tw;
    const deg = (Math.atan2(sinM, cosM) * 180) / Math.PI;
    return deg < 0 ? deg + 360 : deg;
  });
}

// ── モデル重み（暫定：均等配分）
// 日本近海における各モデルの精度序列を確定できる実測データ（ナウファス等）が
// 利用可能になった時点で、検証結果に基づいて見直す予定。
// この1か所を変更すれば全体に反映される。
const MODEL_WEIGHTS = {
  gfs:   0.333,
  ecmwf: 0.334,
  mfwam: 0.333,
} as const;

const MARINE_FIELDS =
  'wave_height,wave_period,wave_direction,sea_surface_temperature,' +
  'swell_wave_height,swell_wave_period,swell_wave_direction';

// ECMWF WAM / MFWAM: コア波浪フィールドのみ（スウェル定義がGFSと異なるため除外）
const ENSEMBLE_FIELDS = 'wave_height,wave_period,wave_direction';

function marineUrl(lat: number, lng: number, pastParam: string, forecastDays: number, model?: string, fields = MARINE_FIELDS): string {
  const modelParam = model ? `&models=${model}` : '';
  return (
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
    `&hourly=${fields}&timezone=Asia%2FTokyo&forecast_days=${forecastDays}${pastParam}${modelParam}`
  );
}

export async function fetchSpotData(
  lat: number,
  lng: number,
  pastDays = 0,
  forecastDays = 16
): Promise<RawHourlyData> {
  NAMI_FETCH_ERRORS.length = 0;
  const pastParam = pastDays > 0 ? `&past_days=${pastDays}` : '';
  // AbortSignal.timeout は Hermes 未対応のため AbortController で代替
  const to = (): RequestInit => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    return { signal: ctrl.signal };
  };

  const [gfsRaw, ecmwfRaw, mfwamRaw, weather] = await Promise.all([
    // GFS（Open-Meteoデフォルト、スウェル含む）
    fetch(marineUrl(lat, lng, pastParam, forecastDays), to())
      .then((r) => { if (!r.ok) throw new Error(`Marine GFS ${r.status}`); return r.json(); })
      .catch((e) => { console.error('[NAMI] GFS wave fetch failed:', e); NAMI_FETCH_ERRORS.push(`GFS: ${e?.message ?? String(e)}`); return null; }),
    // ECMWF WAM（最高精度、約15日間）
    fetch(marineUrl(lat, lng, pastParam, forecastDays, 'ecmwf_wam', ENSEMBLE_FIELDS), to())
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`ECMWF ${r.status}`)))
      .catch((e) => { console.error('[NAMI] ECMWF WAM fetch failed:', e); NAMI_FETCH_ERRORS.push(`ECMWF: ${e?.message ?? String(e)}`); return null; }),
    // MeteoFrance MFWAM（約10日間、ECMWF風駆動）
    fetch(marineUrl(lat, lng, pastParam, forecastDays, 'meteofrance_wave', ENSEMBLE_FIELDS), to())
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`MFWAM ${r.status}`)))
      .catch((e) => { console.error('[NAMI] MFWAM fetch failed:', e); NAMI_FETCH_ERRORS.push(`MFWAM: ${e?.message ?? String(e)}`); return null; }),
    // 風・天気（GFS大気モデル — 必須）
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=wind_speed_10m,wind_direction_10m,temperature_2m,weathercode` +
      `&wind_speed_unit=ms&timezone=Asia%2FTokyo&forecast_days=${forecastDays}${pastParam}`,
      to()
    ).then((r) => { if (!r.ok) throw new Error(`Weather API ${r.status}`); return r.json(); })
     .catch((e) => { console.error('[NAMI] Weather API fetch failed:', e); NAMI_FETCH_ERRORS.push(`Weather: ${e?.message ?? String(e)}`); return null; }),
  ]);

  // 全波浪モデルが取得失敗 → エラーとして上位に伝播（低信頼と混同しない）
  if (!gfsRaw && !ecmwfRaw && !mfwamRaw) {
    throw new Error('[NAMI] All wave model fetches failed');
  }

  const g = gfsRaw?.hourly ?? null;
  const e = ecmwfRaw?.hourly ?? null;
  const m = mfwamRaw?.hourly ?? null;

  // 取得成功したモデルのみをアンサンブルに含める（失敗分は除外され、残りの重みで正規化される）
  const wh = weightedEnsemble([
    ...(g ? [{ data: g.wave_height  as (number | null)[], weight: MODEL_WEIGHTS.gfs }]   : []),
    ...(e ? [{ data: e.wave_height  as (number | null)[], weight: MODEL_WEIGHTS.ecmwf }] : []),
    ...(m ? [{ data: m.wave_height  as (number | null)[], weight: MODEL_WEIGHTS.mfwam }] : []),
  ]);
  const wp = weightedEnsemble([
    ...(g ? [{ data: g.wave_period  as (number | null)[], weight: MODEL_WEIGHTS.gfs }]   : []),
    ...(e ? [{ data: e.wave_period  as (number | null)[], weight: MODEL_WEIGHTS.ecmwf }] : []),
    ...(m ? [{ data: m.wave_period  as (number | null)[], weight: MODEL_WEIGHTS.mfwam }] : []),
  ]);
  const waveDir = weightedCircularMean([
    ...(g ? [{ data: g.wave_direction as (number | null)[], weight: MODEL_WEIGHTS.gfs }]   : []),
    ...(e ? [{ data: e.wave_direction as (number | null)[], weight: MODEL_WEIGHTS.ecmwf }] : []),
    ...(m ? [{ data: m.wave_direction as (number | null)[], weight: MODEL_WEIGHTS.mfwam }] : []),
  ]);

  // スウェル: GFSのみ（ECMWF/MFWAMのスウェル定義が異なるため）
  const baseHourly = g ?? e ?? m;
  return {
    time: baseHourly!.time,
    waveHeight: wh.mean,
    waveHeightMin: wh.min,
    waveHeightMax: wh.max,
    waveModelCount: wh.count,
    wavePeriod: wp.mean,
    waveDirection: waveDir,
    windSpeed: weather?.hourly?.wind_speed_10m ?? [],
    windDirection: weather?.hourly?.wind_direction_10m ?? [],
    temperature: weather?.hourly?.temperature_2m ?? [],
    weatherCode: weather?.hourly?.weathercode ?? [],
    seaSurfaceTemp: g?.sea_surface_temperature ?? [],
    swellHeight:    g?.swell_wave_height       ?? [],
    swellPeriod:    g?.swell_wave_period        ?? [],
    swellDirection: g?.swell_wave_direction     ?? [],
  };
}

export function extractSlots(raw: RawHourlyData): HourlySlot[] {
  return raw.time.map((t, i) => {
    const d = new Date(t);
    const wh = safe(raw.waveHeight[i]);
    return {
      time: d,
      jstDate: t.slice(0, 10),
      hour: parseInt(t.slice(11, 13), 10),
      waveHeight: wh,
      waveHeightMin: safe(raw.waveHeightMin?.[i], wh),
      waveHeightMax: safe(raw.waveHeightMax?.[i], wh),
      waveModelCount: raw.waveModelCount?.[i] ?? 1,
      wavePeriod: safe(raw.wavePeriod[i]),
      waveDirection: safe(raw.waveDirection[i]),
      windSpeed: safe(raw.windSpeed[i]),
      windDirection: safe(raw.windDirection[i]),
      temperature: safe(raw.temperature[i]),
      weatherCode: safe(raw.weatherCode[i]),
      seaSurfaceTemp: raw.seaSurfaceTemp?.[i] ?? null,
      swellHeight: safe(raw.swellHeight?.[i]),
      swellPeriod: safe(raw.swellPeriod?.[i]),
      swellDirection: safe(raw.swellDirection?.[i]),
    };
  });
}

export function getCurrentSlot(slots: HourlySlot[]): HourlySlot {
  const { date, hour } = nowJST();
  return slots.find((s) => s.jstDate === date && s.hour === hour) ?? slots[0];
}

export function getTodaySlots(slots: HourlySlot[]): HourlySlot[] {
  const { date: todayStr } = nowJST();
  const tomorrowMs = Date.now() + 9 * 3600 * 1000 + 24 * 3600 * 1000;
  const td = new Date(tomorrowMs);
  const tomorrowStr = `${td.getUTCFullYear()}-${String(td.getUTCMonth() + 1).padStart(2, '0')}-${String(td.getUTCDate()).padStart(2, '0')}`;

  const targets: [number, string][] = [
    [6, todayStr], [9, todayStr], [12, todayStr], [15, todayStr], [18, todayStr], [21, todayStr], [0, tomorrowStr],
  ];

  return targets.map(([hr, dateStr]) =>
    slots.find((s) => s.jstDate === dateStr && s.hour === hr) ?? slots[0]
  );
}

export function getDailyForecast(slots: HourlySlot[]): DailyEntry[] {
  const JP_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
  const map = new Map<string, HourlySlot[]>();

  slots.forEach((s) => {
    if (!map.has(s.jstDate)) map.set(s.jstDate, []);
    map.get(s.jstDate)!.push(s);
  });

  return Array.from(map.entries()).slice(0, 16).map(([date, hours]) => {
    const noon = hours.find((h) => h.hour === 12) ?? hours[Math.floor(hours.length / 2)];
    // Peak hour = highest mean wave height
    const peak = hours.reduce((best, h) => h.waveHeight > best.waveHeight ? h : best, hours[0]);
    return {
      date,
      dayLabel: JP_DAYS[new Date(`${date}T12:00:00`).getDay()],
      maxWaveHeight: peak.waveHeight,
      maxWaveHeightMin: peak.waveHeightMin,
      maxWaveHeightMax: peak.waveHeightMax,
      maxWaveModelCount: peak.waveModelCount,
      maxWavePeriod: Math.max(...hours.map((h) => h.wavePeriod)),
      avgWindSpeed: hours.reduce((s, h) => s + h.windSpeed, 0) / hours.length,
      noonWindDir: noon.windDirection,
      noonWaveDir: noon.waveDirection,
      noonSwellDir: noon.swellDirection,
      noonSwellHeight: noon.swellHeight,
      noonSwellPeriod: noon.swellPeriod,
      weatherCode: noon.weatherCode,
    };
  });
}

// ── Current-conditions fetch (map layer) ──────────────────────────
// current= エンドポイントのみ使用。fetch時間・通信量を ~400分の1に削減。
export async function fetchCurrentConditions(lat: number, lng: number): Promise<HourlySlot> {
  const to = (): RequestInit => ({ signal: AbortSignal.timeout(6000) });
  const [marineJson, weatherJson] = await Promise.all([
    fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&current=wave_height,wave_period,wave_direction,sea_surface_temperature,` +
      `swell_wave_height,swell_wave_period,swell_wave_direction&timezone=Asia%2FTokyo`,
      to()
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=wind_speed_10m,wind_direction_10m,weathercode&wind_speed_unit=ms&timezone=Asia%2FTokyo`,
      to()
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  if (!marineJson && !weatherJson) throw new Error('[NAMI] fetchCurrentConditions: all APIs failed');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mc: Record<string, unknown> = (marineJson as any)?.current ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wc: Record<string, unknown> = (weatherJson as any)?.current ?? {};
  const timeStr = String(mc.time ?? wc.time ?? '');
  const jstDate = timeStr.slice(0, 10);
  const hour = parseInt(timeStr.slice(11, 13) || '0', 10);
  const wh = safe(mc.wave_height as number | null);

  return {
    time: new Date(),
    jstDate,
    hour,
    waveHeight: wh,
    waveHeightMin: wh,
    waveHeightMax: wh,
    waveModelCount: 1,
    wavePeriod: safe(mc.wave_period as number | null),
    waveDirection: safe(mc.wave_direction as number | null),
    windSpeed: safe(wc.wind_speed_10m as number | null),
    windDirection: safe(wc.wind_direction_10m as number | null),
    temperature: 0,
    weatherCode: safe(wc.weathercode as number | null),
    seaSurfaceTemp: (mc.sea_surface_temperature as number | null) ?? null,
    swellHeight: safe(mc.swell_wave_height as number | null),
    swellPeriod: safe(mc.swell_wave_period as number | null),
    swellDirection: safe(mc.swell_wave_direction as number | null),
  };
}

// ── Daily summary fetch (days 2-15 supplement) ────────────────────
const DAILY_MARINE_FIELDS =
  'wave_height_max,wave_direction_dominant,wave_period_max,' +
  'swell_wave_height_max,swell_wave_direction_dominant,swell_wave_period_max';
const DAILY_WEATHER_FIELDS = 'weathercode,wind_speed_10m_max,wind_direction_10m_dominant';

async function fetchDailyRaw(lat: number, lng: number): Promise<{
  time: string[];
  marine: Record<string, (number | null)[]>;
  weather: Record<string, (number | null)[]>;
}> {
  const to = (): RequestInit => ({ signal: AbortSignal.timeout(6000) });
  const [marineJson, weatherJson] = await Promise.all([
    fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&daily=${DAILY_MARINE_FIELDS}&timezone=Asia%2FTokyo&forecast_days=16`,
      to()
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=${DAILY_WEATHER_FIELDS}&wind_speed_unit=ms&timezone=Asia%2FTokyo&forecast_days=16`,
      to()
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const md: Record<string, unknown> = (marineJson as any)?.daily ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wd: Record<string, unknown> = (weatherJson as any)?.daily ?? {};
  const time: string[] = (md.time ?? wd.time ?? []) as string[];
  return {
    time,
    marine: md as Record<string, (number | null)[]>,
    weather: wd as Record<string, (number | null)[]>,
  };
}

function buildDailyEntriesFromRaw(
  time: string[],
  marine: Record<string, (number | null)[]>,
  weather: Record<string, (number | null)[]>
): DailyEntry[] {
  const JP_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
  return time.map((date, i) => {
    const dayLabel = JP_DAYS[new Date(`${date}T12:00:00`).getDay()];
    const wh = safe(marine.wave_height_max?.[i]);
    return {
      date,
      dayLabel,
      maxWaveHeight: wh,
      maxWaveHeightMin: wh,
      maxWaveHeightMax: wh,
      maxWaveModelCount: 0, // 日別データ: 複数モデル信頼度なし（表示側で判定）
      maxWavePeriod: safe(marine.wave_period_max?.[i]),
      avgWindSpeed: safe(weather.wind_speed_10m_max?.[i]),
      noonWindDir: safe(weather.wind_direction_10m_dominant?.[i]),
      noonWaveDir: safe(marine.wave_direction_dominant?.[i]),
      noonSwellDir: safe(marine.swell_wave_direction_dominant?.[i]),
      noonSwellHeight: safe(marine.swell_wave_height_max?.[i]),
      noonSwellPeriod: safe(marine.swell_wave_period_max?.[i]),
      weatherCode: safe(weather.weathercode?.[i]),
    };
  });
}

// ── Hybrid fetch for forecast/spot-detail pages ───────────────────
// 昨日(past_days=1) + 今日 + 翌日 hourly × 3モデル + 16日 daily を並列取得。
// waveHeightDelta: 今日の正午 - 昨日の正午（前日比）
export async function fetchSpotDataFull(lat: number, lng: number): Promise<{
  slots: HourlySlot[];
  daily: DailyEntry[];
  waveHeightDelta: number | null;
}> {
  const [rawResult, dailyRawResult] = await Promise.allSettled([
    fetchSpotData(lat, lng, 1, 2), // past_days=1 を追加して昨日の実績値も取得
    fetchDailyRaw(lat, lng),
  ]);

  if (rawResult.status === 'rejected') throw rawResult.reason;

  const allSlots = extractSlots(rawResult.value);
  const { date: todayStr } = nowJST();
  const yesterdayStr = getYesterdayJSTStr();

  // 今日+翌日のみ display 用スロットとして渡す（昨日データは delta 計算のみ）
  const slots = allSlots.filter((s) => s.jstDate >= todayStr);

  // 前日比：今日の正午 - 昨日の正午（3モデルアンサンブル波高で計算）
  const yesterdayNoon = allSlots.find((s) => s.jstDate === yesterdayStr && s.hour === 12)?.waveHeight ?? null;
  const todayNoon = allSlots.find((s) => s.jstDate === todayStr && s.hour === 12)?.waveHeight ?? null;
  const waveHeightDelta =
    yesterdayNoon != null && todayNoon != null
      ? parseFloat((todayNoon - yesterdayNoon).toFixed(1))
      : null;

  const hourlyDaily = getDailyForecast(slots);

  if (dailyRawResult.status === 'rejected' || dailyRawResult.value.time.length === 0) {
    console.error('[NAMI] fetchDailyRaw failed, falling back to hourly-only daily');
    return { slots, daily: hourlyDaily, waveHeightDelta };
  }

  const { time, marine, weather } = dailyRawResult.value;
  const hourlyDates = new Set(hourlyDaily.map((e) => e.date));
  const allDaily = buildDailyEntriesFromRaw(time, marine, weather);
  const daily = [
    ...hourlyDaily,
    ...allDaily.filter((e) => !hourlyDates.has(e.date)),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return { slots, daily, waveHeightDelta };
}
