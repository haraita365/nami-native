import { LEVEL_KEY, type Level } from './level';
import { useAsyncStorage } from './useAsyncStorage';

export function useLevel(): [Level | null, (level: Level) => Promise<void>, boolean] {
  const [value, setValue, loading] = useAsyncStorage<Level | null>(LEVEL_KEY, null);
  return [value, setValue, loading];
}
