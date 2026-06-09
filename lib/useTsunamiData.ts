import { useState, useEffect } from 'react';
import { getAreaSpots } from './spots';
import { getTsunamiAlertForSpots, type TsunamiAlertResult, type TsunamiWarning } from './tsunami';

const TSUNAMI_API = 'https://nami-surf-app.vercel.app/api/tsunami-alert';

interface TsunamiApiResponse {
  status: 'ok' | 'error';
  warnings?: TsunamiWarning[];
}

export function useTsunamiData(area: string) {
  const [alert, setAlert] = useState<TsunamiAlertResult | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const spotIds = getAreaSpots(area).map((s) => s.id);

    const poll = async () => {
      try {
        const res = await fetch(TSUNAMI_API);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as TsunamiApiResponse;
        if (cancelled) return;
        if (data.status === 'error' || !Array.isArray(data.warnings)) {
          setFetchError(true);
          return;
        }
        setFetchError(false);
        setAlert(getTsunamiAlertForSpots(spotIds, data.warnings));
      } catch {
        if (!cancelled) setFetchError(true);
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), 60_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [area]);

  return { alert, fetchError };
}
