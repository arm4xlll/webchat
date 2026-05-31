import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { reportFocus } from '../api/push';
import { useAuthStore } from '../store/authStore';

export function useFocusReporting(conversationId: string | null) {
  const isAuthenticated = useAuthStore(s => !!s.accessToken);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) return;

    const report = () => {
      if (appState.current === 'active') {
        reportFocus(conversationId);
      }
    };

    // Initial report
    report();

    // Set up interval for active reporting
    const interval = setInterval(report, 30000);

    // Listen to AppState changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        reportFocus(conversationId);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App goes to background
        reportFocus(null);
      }
      appState.current = nextAppState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
      reportFocus(null);
    };
  }, [conversationId, isAuthenticated]);
}
