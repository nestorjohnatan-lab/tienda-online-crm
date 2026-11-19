import { useCallback, useEffect, useState } from 'react';
import { api } from './http';

export interface Query<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Estado del servidor: carga, error y recarga explícita (invalidación tras mutaciones). */
export function useQuery<T>(path: string): Query<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<T>(path)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

export const money = (v: number, c = 'USD') =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: c }).format(v);

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
