import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import type { Conversation } from '../../types';
import MessageStatus from './MessageStatus';

interface Props {
  conversationId: string;
  conversation: Conversation;
}

const EMPTY_MESSAGES: never[] = [];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageList({ conversationId, conversation }: Props) {
  const user = useAuthStore(s => s.user);
  const messages = useChatStore(s => s.messages[conversationId] ?? EMPTY_MESSAGES);
  const lastReadAt = useChatStore(s => s.lastReadAt[conversationId]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ID собеседника (не я) для отслеживания его last_read_at
  const otherId = conversation.members.find(m => m.id !== user?.id)?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 flex flex-col bg-transparent">
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-tg-input-bg text-tg-text-secondary text-[15px] px-4 py-1.5 rounded-full select-none">
            Нет сообщений
          </div>
        </div>
      )}

      {messages.map((msg, i) => {
        const isOwn = msg.senderId === user?.id;
        const prevMsg = messages[i - 1];
        const nextMsg = messages[i + 1];

        const isFirst = !prevMsg || prevMsg.senderId !== msg.senderId;
        const isLast  = !nextMsg || nextMsg.senderId !== msg.senderId;
        const showName = !isOwn && isFirst;

        // Форма пузырька зависит от позиции в группе
        const bubbleShape = isOwn
          ? isFirst && isLast
            ? 'rounded-l-2xl rounded-tr-2xl rounded-br-[5px]'          // одно
            : isFirst
            ? 'rounded-l-2xl rounded-tr-2xl rounded-br-[5px]'          // верхнее
            : isLast
            ? 'rounded-l-2xl rounded-tr-[5px] rounded-br-2xl'          // нижнее
            : 'rounded-l-2xl rounded-r-[5px]'                          // среднее
          : isFirst && isLast
            ? 'rounded-r-2xl rounded-tl-2xl rounded-bl-[5px]'
            : isFirst
            ? 'rounded-r-2xl rounded-tl-2xl rounded-bl-[5px]'
            : isLast
            ? 'rounded-r-2xl rounded-tl-[5px] rounded-bl-2xl'
            : 'rounded-r-2xl rounded-l-[5px]';

        return (
          <div
            key={msg.id}
            className={`flex w-full select-text animate-slide-in ${
              isOwn ? 'justify-end' : 'justify-start'
            } ${isFirst ? 'mt-3' : 'mt-[2px]'}`}
          >
            <div className={`max-w-[75%] md:max-w-[65%] flex flex-col ${
              isOwn ? 'items-end' : 'items-start'
            }`}>
              {showName && (
                <span className="text-[13px] font-medium text-tg-primary mb-0.5 px-1">
                  {msg.senderName}
                </span>
              )}
              <div className={`relative px-4 py-2 text-[15px] leading-relaxed break-words shadow-sm ${bubbleShape} ${
                isOwn ? 'bg-tg-msg-out text-white' : 'bg-tg-msg-in text-tg-text'
              }`}>
                <div className="flex flex-wrap items-end gap-2">
                  <span className="whitespace-pre-wrap max-w-full break-words">{msg.content}</span>
                  <span className={`flex items-center gap-1 text-[11px] select-none mt-1 ml-auto ${isOwn ? 'text-[rgba(255,255,255,0.6)]' : 'text-tg-text-secondary'}`}>
                    {formatTime(msg.createdAt)}
                    {isOwn && (
                      <MessageStatus
                        messageCreatedAt={msg.createdAt}
                        otherLastReadAt={otherId ? lastReadAt?.[otherId] : undefined}
                      />
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

