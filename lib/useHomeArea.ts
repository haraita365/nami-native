import { isAllowedArea } from './spots';
import { useAsyncStorage } from './useAsyncStorage';

export const HOME_AREA_KEY = 'nami:homeArea';
export const DEFAULT_HOME_AREA = '千葉北';

export function useHomeArea(): [string, (area: string) => Promise<void>, boolean] {
  const [value, setValue, loading] = useAsyncStorage<string>(HOME_AREA_KEY, DEFAULT_HOME_AREA);
  const validValue = isAllowedArea(value) ? value : DEFAULT_HOME_AREA;

  return [validValue, setValue, loading];
}
