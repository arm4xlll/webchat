import { useEffect } from 'react';
import { X, AtSign, Info } from 'lucide-react';
import type { User } from '../../types';
import UserAvatar from '../common/UserAvatar';

interface PresenceInfo {
  online: boolean;
  lastSeenAt?: string;
}

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

interface Props {
  user: User;
  presence?: PresenceInfo;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ user, presence, isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-tg-sidebar-bg border border-tg-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient area with avatar */}
        <div className="relative bg-gradient-to-b from-tg-primary/20 to-transparent pt-8 pb-4 px-6 flex flex-col items-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-tg-text-secondary hover:text-white hover:bg-tg-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="xl" className="ring-4 ring-tg-sidebar-bg" />

          <h2 className="mt-3 text-xl font-semibold text-tg-text text-center leading-tight">
            {user.name}
          </h2>

          {/* Online status */}
          {presence?.online ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-green-400">в сети</span>
            </div>
          ) : presence?.lastSeenAt ? (
            <p className="text-sm text-tg-text-secondary mt-1">
              был(а) {formatLastSeen(presence.lastSeenAt)}
            </p>
          ) : (
            <p className="text-sm text-tg-text-secondary mt-1">не в сети</p>
          )}
        </div>

        {/* Info rows */}
        <div className="px-4 pb-4 space-y-1">
          {/* Username */}
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-tg-hover transition-colors">
            <div className="w-9 h-9 rounded-full bg-tg-primary/15 flex items-center justify-center shrink-0">
              <AtSign className="w-4 h-4 text-tg-primary" />
            </div>
            <div>
              <p className="text-[15px] text-tg-text">@{user.username}</p>
              <p className="text-xs text-tg-text-secondary">имя пользователя</p>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="flex items-start gap-3 px-2 py-3 rounded-xl hover:bg-tg-hover transition-colors">
              <div className="w-9 h-9 rounded-full bg-tg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-tg-primary" />
              </div>
              <div>
                <p className="text-[15px] text-tg-text whitespace-pre-wrap break-words">{user.bio}</p>
                <p className="text-xs text-tg-text-secondary">описание</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
