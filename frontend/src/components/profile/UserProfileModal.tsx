import { useEffect } from 'react';
import { X, AtSign, Info, Clock } from 'lucide-react';
import type { User } from '../../types';
import UserAvatar from '../common/UserAvatar';
import { formatLastSeen } from '../../utils/time';
import { useNow } from '../../hooks/useNow';
import { useTranslation } from '../../hooks/useTranslation';

interface PresenceInfo {
  online: boolean;
  lastSeenAt?: string;
}

interface Props {
  user: User;
  presence?: PresenceInfo;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ user, presence, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const now = useNow(30_000);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOnline = presence?.online === true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-tg-sidebar-bg border border-tg-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with avatar */}
        <div className="relative bg-gradient-to-b from-tg-primary/20 to-transparent pt-8 pb-5 px-6 flex flex-col items-center">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="xl" className="ring-4 ring-tg-sidebar-bg shadow-lg" />

          <h2 className="mt-3 text-xl font-bold text-tg-text text-center leading-tight">
            {user.name}
          </h2>

          {/* Online status */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-sm text-green-400 font-medium">{t('chat.online')}</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-tg-text-secondary shrink-0" />
                <span className="text-sm text-tg-text-secondary">
                  {presence?.lastSeenAt
                    ? formatLastSeen(presence.lastSeenAt, now)
                    : t('chat.offline')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-tg-border mx-4" />

        {/* Info rows */}
        <div className="px-4 py-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-tg-hover transition-colors group">
            <div className="w-9 h-9 rounded-full bg-tg-primary/15 flex items-center justify-center shrink-0">
              <AtSign className="w-4 h-4 text-tg-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-medium text-tg-text truncate">@{user.username}</p>
              <p className="text-xs text-tg-text-secondary mt-0.5">{t('common.username')}</p>
            </div>
          </div>

          {user.bio && (
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-tg-hover transition-colors">
              <div className="w-9 h-9 rounded-full bg-tg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-tg-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] text-tg-text whitespace-pre-wrap break-words leading-relaxed">{user.bio}</p>
                <p className="text-xs text-tg-text-secondary mt-0.5">{t('common.bio')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
