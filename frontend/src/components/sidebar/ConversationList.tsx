import { useMemo } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import type { Conversation } from '../../types';
import UserAvatar from '../common/UserAvatar';
import { MessageSquare, Bookmark } from 'lucide-react';

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
      // Saved always on top
      if (a.type === 'saved') return -1;
      if (b.type === 'saved') return 1;
      const at = a.lastMessageAt ?? a.createdAt;
      const bt = b.lastMessageAt ?? b.createdAt;
      return bt.localeCompare(at); // ISO strings are lexicographically comparable
    });
  }, [conversations]);

  if (!user) return null;

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-tg-input-bg text-tg-text-secondary mb-3">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="text-sm font-medium text-tg-text">Нет чатов</div>
        <div className="text-xs text-tg-text-secondary mt-1 max-w-[180px]">
          Найдите пользователя, чтобы начать диалог
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 space-y-1">
      {sorted.map(conv => {
        const isSaved = conv.type === 'saved';
        const other = isSaved ? getSelf(conv, user.id) : getOther(conv, user.id);
        const convMessages = messages[conv.id] ?? EMPTY_MESSAGES;
        const lastMsg = convMessages[convMessages.length - 1];
        const isActive = activeConversationId === conv.id;
        const unread = unreadCounts[conv.id] ?? 0;
        const otherPresence = !isSaved && other ? presenceStatus[other.id] : undefined;
        const isOnline = otherPresence?.online === true;

        // Last message preview
        let lastPreview = '';
        if (lastMsg) {
          if (lastMsg.deleted) lastPreview = 'Сообщение удалено';
          else if (lastMsg.fileType?.startsWith('audio/')) lastPreview = '🎤 Голосовое';
          else if (lastMsg.fileType?.startsWith('image/')) lastPreview = '🖼 Фото';
          else if (lastMsg.fileType?.startsWith('video/')) lastPreview = '🎬 Видео';
          else if (lastMsg.fileType) lastPreview = `📎 ${lastMsg.fileName ?? 'Файл'}`;
          else lastPreview = lastMsg.content;
        } else if (isSaved) {
          lastPreview = 'Сохраняйте сообщения сюда';
        } else {
          lastPreview = `@${other?.username ?? ''}`;
        }

        // Time to show: prefer lastMessageAt from conv, fallback to last loaded message
        const timeStr = conv.lastMessageAt ?? lastMsg?.createdAt;

        return (
          <div
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 select-none ${
              isActive ? 'bg-tg-active' : 'hover:bg-tg-hover text-tg-text-secondary'
            }`}
            style={isActive ? { color: 'var(--color-tg-msg-out-text)' } : undefined}
          >
            {isSaved ? (
              <div className="w-11 h-11 shrink-0 rounded-full bg-tg-primary flex items-center justify-center">
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

            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className={`font-semibold text-[15px] truncate leading-tight ${isActive ? '' : 'text-tg-text'}`}>
                  {isSaved ? 'Избранное' : (other?.name ?? 'Неизвестно')}
                </span>
                {timeStr && (
                  <span
                    className={`text-[11.5px] shrink-0 ml-2 leading-none ${!isActive ? (unread > 0 ? 'text-tg-primary font-semibold' : 'text-tg-text-secondary') : ''}`}
                    style={isActive ? { color: 'var(--color-tg-msg-out-text-muted)' } : undefined}
                  >
                    {formatTime(timeStr)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`text-[13.5px] truncate leading-tight mt-0.5 flex-1 ${!isActive ? 'text-tg-text-secondary' : ''}`}
                  style={isActive ? { color: 'var(--color-tg-msg-out-text-muted)' } : undefined}
                >
                  {lastPreview}
                </div>
                {unread > 0 && !isActive && (
                  <div className="shrink-0 min-w-[20px] h-5 bg-tg-primary rounded-full flex items-center justify-center px-1.5">
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
