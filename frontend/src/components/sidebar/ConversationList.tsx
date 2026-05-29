import { useMemo } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import type { Conversation } from '../../types';
import UserAvatar from '../common/UserAvatar';
import { MessageSquare, Bookmark, Mic, Image, Video, Paperclip } from 'lucide-react';

const EMPTY_MESSAGES: never[] = [];

function getSelf(conv: Conversation, myId: string) {
  return conv.members.find(m => m.id === myId) ?? conv.members[0];
}

function getOther(conv: Conversation, myId: string) {
  return conv.members.find(m => m.id !== myId) ?? conv.members[0];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}

function PreviewIcon({ fileType }: { fileType: string }) {
  if (fileType.startsWith('audio/')) return <Mic className="w-3 h-3 shrink-0" />;
  if (fileType.startsWith('image/')) return <Image className="w-3 h-3 shrink-0" />;
  if (fileType.startsWith('video/')) return <Video className="w-3 h-3 shrink-0" />;
  return <Paperclip className="w-3 h-3 shrink-0" />;
}

export default function ConversationList() {
  const user = useAuthStore(s => s.user);
  const conversations = useChatStore(s => s.conversations);
  const activeConversationId = useChatStore(s => s.activeConversationId);
  const setActiveConversation = useChatStore(s => s.setActiveConversation);
  const messages = useChatStore(s => s.messages);
  const unreadCounts = useChatStore(s => s.unreadCounts);
  const presenceStatus = useChatStore(s => s.presenceStatus);

  const sorted = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.type === 'saved') return -1;
      if (b.type === 'saved') return 1;
      const at = a.lastMessageAt ?? a.createdAt;
      const bt = b.lastMessageAt ?? b.createdAt;
      return bt.localeCompare(at);
    });
  }, [conversations]);

  if (!user) return null;

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-tg-input-bg flex items-center justify-center mb-3">
          <MessageSquare className="w-7 h-7 text-tg-text-secondary" />
        </div>
        <div className="text-[14px] font-semibold text-tg-text mb-1">Нет чатов</div>
        <div className="text-[12.5px] text-tg-text-secondary max-w-[160px] leading-relaxed">
          Найдите пользователя через поиск, чтобы начать диалог
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
      {sorted.map(conv => {
        const isSaved = conv.type === 'saved';
        const other = isSaved ? getSelf(conv, user.id) : getOther(conv, user.id);
        const convMessages = messages[conv.id] ?? EMPTY_MESSAGES;
        const lastMsg = convMessages[convMessages.length - 1];
        const isActive = activeConversationId === conv.id;
        const unread = unreadCounts[conv.id] ?? 0;
        const otherPresence = !isSaved && other ? presenceStatus[other.id] : undefined;
        const isOnline = otherPresence?.online === true;

        let previewText = '';
        let previewFileType: string | null = null;

        if (lastMsg) {
          if (lastMsg.deleted) {
            previewText = 'Сообщение удалено';
          } else if (lastMsg.fileType?.startsWith('audio/')) {
            previewText = 'Голосовое сообщение';
            previewFileType = lastMsg.fileType;
          } else if (lastMsg.fileType?.startsWith('image/')) {
            previewText = 'Фото';
            previewFileType = lastMsg.fileType;
          } else if (lastMsg.fileType?.startsWith('video/')) {
            previewText = 'Видео';
            previewFileType = lastMsg.fileType;
          } else if (lastMsg.fileType) {
            previewText = lastMsg.fileName ?? 'Файл';
            previewFileType = lastMsg.fileType;
          } else {
            previewText = lastMsg.content;
          }
        } else if (isSaved) {
          previewText = 'Сохраняйте важные сообщения сюда';
        } else {
          previewText = `@${other?.username ?? ''}`;
        }

        const timeStr = conv.lastMessageAt ?? lastMsg?.createdAt;

        return (
          <div
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 select-none overflow-hidden ${
              isActive
                ? 'bg-tg-active'
                : 'hover:bg-tg-hover'
            }`}
            style={isActive ? { color: 'var(--color-tg-msg-out-text)' } : undefined}
          >
            {/* Active left accent bar */}
            {isActive && (
              <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-tg-primary rounded-r-full" />
            )}

            {/* Avatar */}
            {isSaved ? (
              <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-tg-primary to-tg-primary/70 flex items-center justify-center shadow-sm">
                <Bookmark className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="relative shrink-0">
                <UserAvatar name={other?.name ?? '?'} avatarUrl={other?.avatarUrl} size="lg" />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-tg-sidebar-bg" />
                )}
              </div>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* Top row: name + time */}
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className={`font-semibold text-[14.5px] truncate leading-tight ${isActive ? '' : 'text-tg-text'}`}>
                  {isSaved ? 'Избранное' : (other?.name ?? 'Неизвестно')}
                </span>
                {timeStr && (
                  <span className={`text-[11px] shrink-0 tabular-nums leading-none ${
                    isActive
                      ? ''
                      : unread > 0
                        ? 'text-tg-primary font-semibold'
                        : 'text-tg-text-secondary'
                  }`}
                  style={isActive ? { color: 'var(--color-tg-msg-out-text-muted)' } : undefined}
                  >
                    {formatTime(timeStr)}
                  </span>
                )}
              </div>

              {/* Bottom row: preview + unread */}
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-1.5 text-[13px] truncate leading-snug flex-1 min-w-0 ${
                  isActive ? '' : 'text-tg-text-secondary'
                }`}
                style={isActive ? { color: 'var(--color-tg-msg-out-text-muted)' } : undefined}
                >
                  {previewFileType && !lastMsg?.deleted && (
                    <span className={isActive ? '' : 'text-tg-primary'} style={isActive ? { color: 'var(--color-tg-msg-out-text-muted)' } : undefined}>
                      <PreviewIcon fileType={previewFileType} />
                    </span>
                  )}
                  <span className="truncate">{previewText}</span>
                </div>

                {unread > 0 && !isActive && (
                  <div className="shrink-0 min-w-[20px] h-5 bg-tg-primary rounded-full flex items-center justify-center px-1.5 shadow-sm">
                    <span className="text-[11px] font-bold text-white leading-none tabular-nums">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
