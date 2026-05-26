import api from './client';

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
