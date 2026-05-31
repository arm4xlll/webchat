import { useEffect, useRef } from 'react';
import { reportFocus } from '../api/push';

export function useFocusReporting(conversationId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sendFocus = () => {
      const visible = document.visibilityState === 'visible';
      reportFocus(visible && conversationId ? conversationId : null);
    };

    sendFocus();

    // Refresh every 30s so the Redis TTL (35s) doesn't expire while active
    intervalRef.current = setInterval(sendFocus, 30_000);

    document.addEventListener('visibilitychange', sendFocus);

    return () => {
      document.removeEventListener('visibilitychange', sendFocus);
      if (intervalRef.current) clearInterval(intervalRef.current);
      reportFocus(null);
    };
  }, [conversationId]);
}
