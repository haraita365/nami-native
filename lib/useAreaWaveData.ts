import { useQuery } from '@tanstack/react-query';
import {
  fetchSpotData, extractSlots, getCurrentSlot,
  nowJST, getYesterdayJSTStr,
} from './api';
import { getWindCondition } from './wind';
import { getConfidenceStars } from './wave';
import { scoreSlot } from './scoring';
import { scoreToStars } from './levelScore';
import { getAreaSpots } from './spots';

export interface AreaSpotRow {
  id: string;
  name: string;
  waveHeight: number;
  waveMin: number;
  waveMax: number;
  waveModelCount: number;
  wavePeriod: number;
  windCondition: 'offshore' | 'side' | 'onshore';
  windDirection: number;
  windSpeed: number;
  score: number;
  stars: number;
  confidenceStr: string;
  swellDirection: number;
  swellHeight: number;
  swellPeriod: number;
  geoIdx: number;
  waveHeightDelta: number | null;
}

async function fetchAreaRows(area: string): Promise<AreaSpotRow[]> {
  const areaSpots = getAreaSpots(area);
  if (areaSpots.length === 0) return [];

  const results = await Promise.allSettled(
    areaSpots.map((s) => fetchSpotData(s.lat, s.lng, 1)),
  );

  const { date: todayStr } = nowJST();
  const yesterdayStr = getYesterdayJSTStr();
  const rows: AreaSpotRow[] = [];

  areaSpots.forEach((spot, i) => {
    const r = results[i];
    if (r.status !== 'fulfilled') return;
    try {
      const slots = extractSlots(r.value);
      const current = getCurrentSlot(slots);
      const score = scoreSlot(current, spot.beachDirection);
      const windCond = getWindCondition(current.windDirection, spot.beachDirection);
      const conf = getConfidenceStars(
        current.waveHeightMin, current.waveHeightMax, current.waveModelCount,
      ) ?? '低';

      const todayNoon   = slots.find((s) => s.jstDate === todayStr     && s.hour === 12)?.waveHeight ?? null;
      const yesterdayNoon = slots.find((s) => s.jstDate === yesterdayStr && s.hour === 12)?.waveHeight ?? null;
      const waveHeightDelta =
        todayNoon != null && yesterdayNoon != null
          ? parseFloat((todayNoon - yesterdayNoon).toFixed(1))
          : null;

      rows.push({
        id: spot.id,
        name: spot.name,
        waveHeight: current.waveHeight,
        waveMin: current.waveHeightMin,
        waveMax: current.waveHeightMax,
        waveModelCount: current.waveModelCount,
        wavePeriod: current.wavePeriod,
        windCondition: windCond,
        windDirection: current.windDirection,
        windSpeed: current.windSpeed,
        score,
        stars: scoreToStars(score),
        confidenceStr: conf,
        swellDirection: current.swellDirection,
        swellHeight: current.swellHeight,
        swellPeriod: current.swellPeriod,
        geoIdx: i,
        waveHeightDelta,
      });
    } catch {
      // skip failed spot
    }
  });

  if (rows.length === 0) throw new Error('エリア内の波予報データを取得できませんでした');
  return rows;
}

export function useAreaWaveData(area: string) {
  return useQuery<AreaSpotRow[], Error>({
    queryKey: ['area-wave', area],
    queryFn: () => fetchAreaRows(area),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}
