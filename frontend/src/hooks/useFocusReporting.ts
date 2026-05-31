import { useEffect } from 'react';
import { reportFocus, reportFocusKeepalive } from '../api/push';

/**
 * Tells the backend which conversation the user is *actively looking at* so it
 * can suppress push notifications for that chat. Robustness is critical here:
 * a single missed heartbeat must not make the server think the user left.
 *
 * Strategy:
 *  - Heartbeat every 20s (server TTL is 60s → tolerates 2 missed beats).
 *  - Re-report immediately on tab focus / network reconnect / bfcache restore.
 *  - Clear focus the instant the tab is hidden or unloaded, via a keepalive
 *    fetch that survives page teardown, so pushes resume without waiting for
 *    the TTL to expire.
 *  - Only report focus while the tab is actually visible.
 */
const HEARTBEAT_MS = 20_000;

export function useFocusReporting(conversationId: string | null) {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    // The conversation we're focused on, or null when the tab isn't visible.
    const focusValue = () =>
      document.visibilityState === 'visible' ? conversationId : null;

    const beat = () => reportFocus(focusValue());

    const startHeartbeat = () => {
      if (interval !== null) return;
      beat();
      interval = setInterval(beat, HEARTBEAT_MS);
    };

    const stopHeartbeat = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startHeartbeat(); // resumes + sends an immediate refresh
      } else {
        stopHeartbeat();
        reportFocusKeepalive(null); // clear now so pushes resume immediately
      }
    };

    // Tab is being torn down (close/navigate/bfcache) — release focus reliably.
    const onPageHide = () => {
      stopHeartbeat();
      reportFocusKeepalive(null);
    };

    // Window regained focus or network came back — re-assert focus right away.
    const onResume = () => {
      if (document.visibilityState === 'visible') beat();
    };

    if (document.visibilityState === 'visible') {
      startHeartbeat();
    } else {
      reportFocus(null);
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('focus', onResume);
    window.addEventListener('online', onResume);
    window.addEventListener('pageshow', onResume);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('online', onResume);
      window.removeEventListener('pageshow', onResume);
      // Re-report current focus for the conversation we're switching to (the
      // effect re-runs with the new id). No null is sent in between, so there's
      // no window where a message to the new chat would wrongly notify.
      reportFocus(focusValue());
    };
  }, [conversationId]);
}
