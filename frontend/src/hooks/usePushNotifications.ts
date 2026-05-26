import { useEffect, useRef, useState } from 'react';
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

async function subscribe(registration: ServiceWorkerRegistration) {
  if (Notification.permission === 'denied') return;
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return;
  }

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
  const [isSupported] = useState(
    () => 'serviceWorker' in navigator && 'PushManager' in window
  );
  const isAuthenticated = useAuthStore(s => !!s.accessToken);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const askedRef = useRef(false);

  useEffect(() => {
    if (!isSupported || !isAuthenticated) return;

    navigator.serviceWorker.register('/sw.js').then(reg => {
      registrationRef.current = reg;

      // Если разрешение уже выдано — подписываемся сразу без диалога
      if (Notification.permission === 'granted') {
        subscribe(reg).catch(console.error);
        return;
      }

      // Просим разрешение когда пользователь уходит с вкладки —
      // именно в этот момент push-уведомления наиболее полезны
      const onBlur = () => {
        if (askedRef.current) return;
        askedRef.current = true;
        subscribe(reg).catch(console.error);
      };
      window.addEventListener('blur', onBlur, { once: true });
      return () => window.removeEventListener('blur', onBlur);
    }).catch(e => console.error('[Push] SW registration failed', e));
  }, [isSupported, isAuthenticated]);
}
