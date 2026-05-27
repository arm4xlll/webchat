import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import type { Conversation } from '../../types';
import UserAvatar from '../common/UserAvatar';
import { MessageSquare } from 'lucide-react';

const EMPTY_MESSAGES: never[] = [];

function getOtherMember(conv: Conversation, myId: string) {
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
  const { conversations, activeConversationId, setActiveConversation, messages } = useChatStore();

  if (!user) return null;

  if (conversations.length === 0) {
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
      {conversations.map(conv => {
        const other = getOtherMember(conv, user.id);
        const convMessages = messages[conv.id] ?? EMPTY_MESSAGES;
        const lastMsg = convMessages[convMessages.length - 1];
        const isActive = activeConversationId === conv.id;

        return (
          <div
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 select-none ${
              isActive
                ? 'bg-tg-active text-white'
                : 'hover:bg-tg-hover text-tg-text-secondary'
            }`}
          >
            <UserAvatar name={other?.name ?? '?'} avatarUrl={other?.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className={`font-semibold text-[15px] truncate leading-tight ${
                  isActive ? 'text-white' : 'text-tg-text'
                }`}>
                  {other?.name ?? 'Неизвестно'}
                </span>
                {lastMsg && (
                  <span className={`text-[11.5px] shrink-0 ml-2 leading-none ${isActive ? 'text-white/70' : 'text-tg-text-secondary'}`}>
                    {formatTime(lastMsg.createdAt)}
                  </span>
                )}
              </div>
              <div className={`text-[13.5px] truncate leading-tight mt-0.5 ${
                isActive ? 'text-white/70' : 'text-tg-text-secondary'
              }`}>
                {lastMsg ? lastMsg.content : `@${other?.username ?? ''}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

