import { useState, useCallback } from 'react';
import { Pin, ChevronUp, X } from 'lucide-react';
import type { PinnedMessage } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  pins: PinnedMessage[];
  onJumpTo: (messageId: string) => void;
  onUnpin: (pinId: string) => void;
  currentUserId?: string;
}

export default function PinnedBanner({ pins, onJumpTo, onUnpin, currentUserId }: Props) {
  const { t } = useTranslation();
  // Current index shown in the banner — clicking cycles through pins (newest first)
  const [idx, setIdx] = useState(0);

  const handleBannerClick = useCallback(() => {
    if (pins.length === 0) return;
    const pin = pins[idx];
    onJumpTo(pin.messageId);
    // Cycle to next pin (like Telegram — each click shows previous)
    setIdx(prev => (prev + 1) % pins.length);
  }, [pins, idx, onJumpTo]);

  if (pins.length === 0) return null;

  const pin = pins[Math.min(idx, pins.length - 1)];
  const canUnpin = pin.pinnedByUserId === currentUserId || !pin.pinnedForAll;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-tg-sidebar-bg border-b border-tg-border shrink-0">
      <Pin className="w-3.5 h-3.5 text-tg-primary shrink-0 rotate-45" />

      {/* Clickable area — jumps to the pinned message */}
      <button
        onClick={handleBannerClick}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-tg-primary leading-none shrink-0">
            {pins.length > 1 ? t('chat.pinnedCount', { current: idx + 1, total: pins.length }) : t('chat.pinnedSingle')}
          </span>
        </div>
        <div className="text-[13px] text-tg-text truncate mt-0.5">
          {pin.content || t('chat.mediaFile')}
        </div>
      </button>

      {/* Navigate to previous pin */}
      {pins.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx(prev => (prev - 1 + pins.length) % pins.length);
          }}
          className="p-1 text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover rounded-full transition-colors cursor-pointer shrink-0"
          title={t('chat.prevPinned')}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}

      {/* Unpin button */}
      {canUnpin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnpin(pin.id);
            if (idx >= pins.length - 1) setIdx(Math.max(0, pins.length - 2));
          }}
          className="p-1 text-tg-text-secondary hover:text-rose-400 hover:bg-tg-hover rounded-full transition-colors cursor-pointer shrink-0"
          title={t('chat.unpin')}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
