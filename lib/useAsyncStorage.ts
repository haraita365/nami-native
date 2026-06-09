import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 同一キーを持つ複数のインスタンス間で値を同期するためのpub/sub
// setValue が呼ばれると、同キーの全インスタンスに新しい値を通知する
const keyListeners = new Map<string, Set<(value: unknown) => void>>();

function notifyListeners(key: string, value: unknown) {
  keyListeners.get(key)?.forEach((fn) => fn(value));
}

function subscribe(key: string, fn: (value: unknown) => void): () => void {
  if (!keyListeners.has(key)) keyListeners.set(key, new Set());
  keyListeners.get(key)!.add(fn);
  return () => keyListeners.get(key)?.delete(fn);
}

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

  // 初回マウント時に AsyncStorage から読み込む
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        const value = raw != null ? (JSON.parse(raw) as T) : initialValue;
        setState({ value, loading: false });
      })
      .catch(() => setState({ value: initialValue, loading: false }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 同一キーを持つ別インスタンスの setValue を購読する
  useEffect(() => {
    return subscribe(key, (newValue) => {
      setState({ value: newValue as T, loading: false });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    async (value: T) => {
      setState((prev) => ({ ...prev, value }));
      notifyListeners(key, value); // 同キーの全インスタンスに伝播
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
