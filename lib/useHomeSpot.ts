import { useAsyncStorage } from './useAsyncStorage';

export const HOME_SPOT_KEY = 'nami:homeSpot';
export const DEFAULT_SPOT_ID = 'shidashita';

export function useHomeSpot(): [string, (id: string) => Promise<void>, boolean] {
  const [value, setValue, loading] = useAsyncStorage<string>(HOME_SPOT_KEY, DEFAULT_SPOT_ID);
  return [value, setValue, loading];
}
