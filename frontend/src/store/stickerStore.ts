import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StickerPack, StickerItem } from '../types/sticker';
import { getMyPacks, getPackBySlug } from '../api/stickers';

const RECENT_MAX = 20;

interface StickerState {
  packs: StickerPack[];
  loadedSlugs: Record<string, StickerItem[]>; // slug → stickers
  recentStickers: StickerItem[];
  packsLoaded: boolean;

  loadUserPacks: () => Promise<void>;
  loadPackStickers: (slug: string) => Promise<StickerItem[]>;
  trackUsed: (sticker: StickerItem) => void;
  invalidate: () => void;
  invalidatePackCache: (slug: string) => void;
}

export const useStickerStore = create<StickerState>()(
  persist(
    (set, get) => ({
      packs: [],
      loadedSlugs: {},
      recentStickers: [],
      packsLoaded: false,

      loadUserPacks: async () => {
        if (get().packsLoaded) return;
        const packs = await getMyPacks();
        set({ packs, packsLoaded: true });
      },

      loadPackStickers: async (slug: string) => {
        const cached = get().loadedSlugs[slug];
        if (cached) return cached;
        const pack = await getPackBySlug(slug);
        set(s => ({ loadedSlugs: { ...s.loadedSlugs, [slug]: pack.stickers } }));
        return pack.stickers;
      },

      trackUsed: (sticker: StickerItem) => {
        set(s => {
          const filtered = s.recentStickers.filter(r => r.id !== sticker.id);
          return { recentStickers: [sticker, ...filtered].slice(0, RECENT_MAX) };
        });
      },

      invalidate: () => set({ packsLoaded: false }),

      invalidatePackCache: (slug: string) =>
        set(s => {
          const { [slug]: _, ...rest } = s.loadedSlugs;
          return { loadedSlugs: rest };
        }),
    }),
    {
      name: 'sticker-store',
      partialize: (s) => ({ recentStickers: s.recentStickers }),
    }
  )
);
