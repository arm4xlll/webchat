import { useEffect, useState } from 'react';

/**
 * Returns a `Date.now()` value that refreshes every `intervalMs`, so components
 * showing relative time (e.g. "5 минут назад") re-render and stay current
 * without any external state change.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
