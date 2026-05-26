import { useEffect, useRef, useState } from 'react';
import { getPublicKey, subscribeToPush } from '../api/push';
import { useAuthStore } from '../store/authStore';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function doSubscribe(registration: ServiceWorkerRegistration) {
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const publicKey = await getPublicKey();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  await subscribeToPush(subscription);
}

export function usePushNotifications() {
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  const isAuthenticated = useAuthStore(s => !!s.accessToken);
  const [showBanner, setShowBanner] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!isSupported || !isAuthenticated) return;

    navigator.serviceWorker.register('/sw.js').then(reg => {
      registrationRef.current = reg;

      if (Notification.permission === 'granted') {
        doSubscribe(reg).catch(console.error);
      } else if (Notification.permission === 'default') {
        setShowBanner(true);
      }
    }).catch(e => console.error('[Push] SW registration failed', e));
  }, [isSupported, isAuthenticated]);

  const requestPermission = async () => {
    setShowBanner(false);
    const result = await Notification.requestPermission();
    if (result === 'granted' && registrationRef.current) {
      doSubscribe(registrationRef.current).catch(console.error);
    }
  };

  return { showBanner, requestPermission };
}
