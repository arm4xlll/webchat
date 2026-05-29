import { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, Loader2, Plus } from 'lucide-react';
import { useStickerStore } from '../../store/stickerStore';
import type { StickerItem, StickerPack } from '../../types/sticker';
import { isStickerVideoType } from '../../types/sticker';
import CreatePackModal from './CreatePackModal';

interface Props {
  onSend: (sticker: StickerItem) => void;
  onClose: () => void;
}

const RECENT_TAB = '__recent__';

export default function StickerPicker({ onSend, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const { packs, recentStickers, loadedSlugs, packsLoaded, loadUserPacks, loadPackStickers, trackUsed } =
    useStickerStore();

  const [activeTab, setActiveTab] = useState<string>(RECENT_TAB);
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingTab, setLoadingTab] = useState(false);
  const [displayedStickers, setDisplayedStickers] = useState<StickerItem[]>([]);
  const [activePack, setActivePack] = useState<StickerPack | null>(null);

  // Load user packs on mount
  useEffect(() => {
    loadUserPacks();
  }, [loadUserPacks]);

  // Default to first pack once packs are loaded (if no recent)
  useEffect(() => {
    if (packsLoaded && packs.length > 0 && recentStickers.length === 0 && activeTab === RECENT_TAB) {
      selectTab(packs[0].slug);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packsLoaded]);

  // Sync displayed stickers when tab/recent changes
  useEffect(() => {
    if (activeTab === RECENT_TAB) {
      setDisplayedStickers(recentStickers);
      setActivePack(null);
      return;
    }
    const cached = loadedSlugs[activeTab];
    if (cached) {
      setDisplayedStickers(cached);
      setActivePack(packs.find(p => p.slug === activeTab) ?? null);
    }
  }, [activeTab, loadedSlugs, recentStickers, packs]);

  const selectTab = useCallback(async (slug: string) => {
    if (slug === RECENT_TAB) {
      setActiveTab(RECENT_TAB);
      return;
    }
    setActiveTab(slug);
    if (!loadedSlugs[slug]) {
      setLoadingTab(true);
      await loadPackStickers(slug);
      setLoadingTab(false);
    }
  }, [loadedSlugs, loadPackStickers]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSend = (sticker: StickerItem) => {
    trackUsed(sticker);
    onSend(sticker);
    onClose();
  };

  const hasRecent = recentStickers.length > 0;
  const currentPackName =
    activeTab === RECENT_TAB ? 'Недавние' : (activePack?.title ?? activeTab);

  return (
    <>
    {createOpen && <CreatePackModal onClose={() => setCreateOpen(false)} />}
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-tg-sidebar-bg border border-tg-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{ height: 400 }}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 border-b border-tg-border overflow-x-auto shrink-0 scrollbar-none">
        {hasRecent && (
          <TabButton
            active={activeTab === RECENT_TAB}
            onClick={() => selectTab(RECENT_TAB)}
            title="Недавние"
          >
            <Clock className="w-4.5 h-4.5" />
          </TabButton>
        )}

        {packs.map(pack => {
          // Если стикеры уже загружены — показываем первый как иконку вкладки
          const firstSticker = loadedSlugs[pack.slug]?.[0];
          return (
            <TabButton
              key={pack.slug}
              active={activeTab === pack.slug}
              onClick={() => selectTab(pack.slug)}
              title={pack.title}
            >
              {firstSticker ? (
                isStickerVideoType(firstSticker.contentType) ? (
                  <video
                    src={firstSticker.fileUrl}
                    className="w-6 h-6 object-contain"
                    autoPlay loop muted playsInline preload="metadata"
                  />
                ) : (
                  <img
                    src={firstSticker.fileUrl}
                    alt={pack.title}
                    className="w-6 h-6 object-contain"
                    loading="lazy"
                  />
                )
              ) : (
                <span className="text-sm font-bold text-tg-text-secondary leading-none select-none">
                  {pack.title.charAt(0).toUpperCase()}
                </span>
              )}
            </TabButton>
          );
        })}

        {!packsLoaded && (
          <div className="px-2 py-1.5">
            <Loader2 className="w-4 h-4 animate-spin text-tg-text-secondary" />
          </div>
        )}

        {/* Кнопка создания нового пака */}
        <TabButton active={false} onClick={() => setCreateOpen(true)} title="Создать стикерпак">
          <Plus className="w-4.5 h-4.5" />
        </TabButton>
      </div>

      {/* Pack label */}
      <div className="px-3 py-1.5 text-[11px] font-semibold text-tg-text-secondary uppercase tracking-wide select-none shrink-0">
        {currentPackName}
      </div>

      {/* Sticker grid */}
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        {loadingTab ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-tg-text-secondary" />
          </div>
        ) : displayedStickers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-tg-text-secondary select-none">
            {activeTab === RECENT_TAB ? 'Вы ещё не отправляли стикеры' : 'Нет стикеров'}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-0.5">
            {displayedStickers.map(sticker => (
              <StickerCell key={sticker.id} sticker={sticker} onClick={handleSend} />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-colors cursor-pointer
        ${active
          ? 'bg-tg-primary/20 text-tg-primary'
          : 'text-tg-text-secondary hover:bg-tg-hover hover:text-tg-text'
        }`}
    >
      {children}
    </button>
  );
}

function StickerCell({ sticker, onClick }: { sticker: StickerItem; onClick: (s: StickerItem) => void }) {
  const isVideo = isStickerVideoType(sticker.contentType);

  return (
    <button
      onClick={() => onClick(sticker)}
      className="aspect-square flex items-center justify-center rounded-xl hover:bg-tg-hover transition-colors cursor-pointer p-1"
    >
      {isVideo ? (
        <video
          src={sticker.fileUrl}
          className="w-full h-full object-contain"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={sticker.fileUrl}
          alt=""
          className="w-full h-full object-contain"
          loading="lazy"
        />
      )}
    </button>
  );
}
