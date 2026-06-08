import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AsyncStorageState<T> {
  value: T;
  loading: boolean;
}

export function useAsyncStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => Promise<void>, boolean] {
  const [state, setState] = useState<AsyncStorageState<T>>({
    value: initialValue,
    loading: true,
  });

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        const value = raw != null ? (JSON.parse(raw) as T) : initialValue;
        setState({ value, loading: false });
      })
      .catch(() => setState({ value: initialValue, loading: false }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    async (value: T) => {
      setState((prev) => ({ ...prev, value }));
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore write errors
      }
    },
    [key],
  );

  return [state.value, setValue, state.loading];
}
