import api from './client';
import { useAuthStore } from '../store/authStore';

export const getPublicKey = async () => {
  const { data } = await api.get<{ publicKey: string }>('/push/public-key');
  return data.publicKey;
};

export const subscribeToPush = async (subscription: PushSubscription) => {
  const subJson = subscription.toJSON();
  await api.post('/push/subscribe', {
    endpoint: subJson.endpoint,
    p256dh: subJson.keys?.p256dh,
    auth: subJson.keys?.auth
  });
};

export const reportFocus = (conversationId: string | null) =>
  api.post('/presence/focus', { conversationId: conversationId ?? '' }).catch(() => {});

/**
 * Reports focus using a keepalive fetch so the request survives page unload /
 * tab hide (axios/XHR does not). sendBeacon can't carry the Bearer header, so
 * we use fetch + keepalive instead. Used to *clear* focus the instant the user
 * leaves, guaranteeing pushes resume immediately.
 */
export const reportFocusKeepalive = (conversationId: string | null) => {
  try {
    const token = useAuthStore.getState().accessToken;
    fetch('/api/presence/focus', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ conversationId: conversationId ?? '' }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
};
