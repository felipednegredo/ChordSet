import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logError } from '../services/errors';

export interface AsyncResource<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  reload: () => Promise<void>;
  /** Local (optimistic) update of the loaded data. */
  mutate: (updater: (current: T) => T) => void;
}

/**
 * Loads data asynchronously and reloads it whenever the screen regains focus,
 * so lists stay fresh after editing on another screen.
 *
 * `loader` must be memoised with `useCallback`; a new loader triggers a reload.
 */
export function useAsyncResource<T>(loader: () => Promise<T>): AsyncResource<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    try {
      const result = await loader();
      if (mounted.current && current === requestId.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      logError('useAsyncResource', err);
      if (mounted.current && current === requestId.current) setError(err);
    } finally {
      if (mounted.current && current === requestId.current) setLoading(false);
    }
  }, [loader]);

  const mutate = useCallback((updater: (current: T) => T) => {
    setData((current) => (current === undefined ? current : updater(current)));
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, loading, error, reload, mutate };
}
