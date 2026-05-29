import api from './client';
import type { StickerPack } from '../types/sticker';

// GET /api/stickers/packs/my — паки пользователя в порядке вкладок
// NOTE: бэкенд возвращает StickerPack без стикеров (поле stickers = []).
// Стикеры грузятся отдельно через getPackBySlug при открытии вкладки.
export const getMyPacks = (): Promise<StickerPack[]> =>
  api.get<StickerPack[]>('/stickers/packs/my').then(r => r.data);

// GET /api/stickers/packs/{slug} — полный пак со стикерами (JOIN FETCH)
export const getPackBySlug = (slug: string): Promise<StickerPack> =>
  api.get<StickerPack>(`/stickers/packs/${slug}`).then(r => r.data);

// POST /api/stickers/packs/{slug}/subscribe — добавить чужой пак в свою коллекцию
export const subscribeToPack = (slug: string): Promise<void> =>
  api.post(`/stickers/packs/${slug}/subscribe`).then(() => undefined);

// POST /api/stickers/packs (multipart) — создать свой пак
export const createStickerPack = (
  metadata: { slug: string; title: string; stickers: { emojis: string }[] },
  files: File[]
): Promise<StickerPack> => {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  files.forEach(f => form.append('files', f));
  return api.post<StickerPack>('/stickers/packs', form).then(r => r.data);
};
