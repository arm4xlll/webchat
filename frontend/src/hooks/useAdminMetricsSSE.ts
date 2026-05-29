import { useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { AdminMetricsSnapshot } from '../types/admin';
import { useAuthStore } from '../store/authStore';

const MAX_HISTORY = 3600; // 1 hour at 1s intervals

export function useAdminMetricsSSE() {
  const [latest, setLatest]       = useState<AdminMetricsSnapshot | null>(null);
  const [history, setHistory]     = useState<AdminMetricsSnapshot[]>([]);
  const [connected, setConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const token = useAuthStore(s => s.accessToken);

  useEffect(() => {
    if (!token) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      try {
        await fetchEventSource('/api/admin/metrics/stream', {
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${token}` },
          openWhenHidden: true,
          async onopen(res) {
            if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
              setConnected(true);
            } else {
              throw new Error(`Unexpected status ${res.status}`);
            }
          },
          onmessage(ev) {
            if (ev.event !== 'metrics') return;
            const snap: AdminMetricsSnapshot = JSON.parse(ev.data);
            setLatest(snap);
            setHistory(prev => {
              const next = [...prev, snap];
              return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
            });
          },
          onclose() {
            setConnected(false);
          },
          onerror() {
            setConnected(false);
          },
        });
      } catch {
        setConnected(false);
      }
    };

    run();

    return () => {
      ctrl.abort();
      setConnected(false);
    };
  }, [token]);

  return { latest, history, connected };
}
