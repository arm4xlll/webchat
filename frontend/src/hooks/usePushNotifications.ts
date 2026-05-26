import { useEffect, useState } from 'react';
import { getPublicKey, subscribeToPush } from '../api/push';
import { useAuthStore } from '../store/authStore';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isAuthenticated = useAuthStore(s => !!s.accessToken);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    if (!isSupported || !isAuthenticated) return;

    const setupPush = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        if (Notification.permission === 'default') {
           await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') {
          console.log('[Push] Permission denied');
          return;
        }

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const publicKey = await getPublicKey();
          const applicationServerKey = urlBase64ToUint8Array(publicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }
        
        await subscribeToPush(subscription);
        setIsSubscribed(true);
        console.log('[Push] Successfully subscribed to push notifications');
      } catch (e) {
        console.error('[Push] Failed to setup push notifications', e);
      }
    };

    setupPush();
  }, [isSupported, isAuthenticated]);

  return { isSupported, isSubscribed };
}
