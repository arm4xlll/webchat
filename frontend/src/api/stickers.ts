import api from './client';
import type { StickerPack } from '../types/sticker';

export const getMyPacks = (): Promise<StickerPack[]> =>
  api.get<StickerPack[]>('/stickers/packs/my').then(r => r.data);

export const getPackBySlug = (slug: string): Promise<StickerPack> =>
  api.get<StickerPack>(`/stickers/packs/${slug}`).then(r => r.data);

export const subscribeToPack = (slug: string): Promise<void> =>
  api.post(`/stickers/packs/${slug}/subscribe`).then(() => undefined);

export const unsubscribeFromPack = (packId: string): Promise<void> =>
  api.delete(`/stickers/packs/subscriptions/${packId}`).then(() => undefined);

export const reorderPacks = (packIds: string[]): Promise<void> =>
  api.put('/stickers/packs/reorder', packIds).then(() => undefined);

export const createStickerPack = (
  metadata: { slug: string; name: string; isPublic: boolean; stickers: { emojis: string[] }[] },
  files: File[]
): Promise<StickerPack> => {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  files.forEach(f => form.append('files', f));
  return api.post<StickerPack>('/stickers/packs', form).then(r => r.data);
};
