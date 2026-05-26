import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import type { Conversation, Message } from '../../types';
import MessageStatus from './MessageStatus';
import MediaViewer from './MediaViewer';

interface Props {
  conversationId: string;
  conversation: Conversation;
}

const EMPTY_MESSAGES: never[] = [];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function isImage(type?: string) { return !!type?.startsWith('image/'); }
function isVideo(type?: string) { return !!type?.startsWith('video/'); }

interface MediaBubbleProps {
  msg: Message;
  isOwn: boolean;
  bubbleShape: string;
  timeNode: React.ReactNode;
  onImageClick: (src: string, alt: string) => void;
}

function MediaBubble({ msg, isOwn, bubbleShape, timeNode, onImageClick }: MediaBubbleProps) {
  const hasCaption = msg.content.trim().length > 0;
  const bgClass = isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in';

  return (
    <div className={`overflow-hidden ${bubbleShape} ${bgClass} shadow-sm`}>
      {isImage(msg.fileType) && (
        <div
          className="relative cursor-pointer group"
          onClick={() => onImageClick(msg.fileUrl!, msg.fileName ?? '')}
        >
          <img
            src={msg.fileUrl}
            alt={msg.fileName ?? 'image'}
            className="block w-full max-w-xs object-cover group-hover:brightness-90 transition-[filter]"
            loading="lazy"
          />
          {!hasCaption && (
            <div className="absolute bottom-1.5 right-2 bg-black/50 rounded-full px-1.5 py-0.5 flex items-center gap-1">
              {timeNode}
            </div>
          )}
        </div>
      )}

      {isVideo(msg.fileType) && (
        <div className="relative">
          <video
            src={msg.fileUrl}
            controls
            className="block w-full max-w-xs max-h-64 bg-black"
            preload="metadata"
          />
          {!hasCaption && (
            <div className="absolute bottom-1.5 right-2 bg-black/50 rounded-full px-1.5 py-0.5 flex items-center gap-1">
              {timeNode}
            </div>
          )}
        </div>
      )}

      {hasCaption && (
        <div className="px-3 pt-1.5 pb-2 flex flex-wrap items-end gap-2">
          <span className={`text-[15px] leading-relaxed break-words whitespace-pre-wrap ${isOwn ? 'text-white' : 'text-tg-text'}`}>
            {msg.content}
          </span>
          <span className={`ml-auto flex items-center gap-1 text-[11px] select-none ${isOwn ? 'text-[rgba(255,255,255,0.6)]' : 'text-tg-text-secondary'}`}>
            {timeNode}
          </span>
        </div>
      )}
    </div>
  );
}

export default function MessageList({ conversationId, conversation }: Props) {
  const user = useAuthStore(s => s.user);
  const messages = useChatStore(s => s.messages[conversationId] ?? EMPTY_MESSAGES);
  const lastReadAt = useChatStore(s => s.lastReadAt[conversationId]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const otherId = conversation.members.find(m => m.id !== user?.id)?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
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
          const hasMedia = isImage(msg.fileType) || isVideo(msg.fileType);

          const bubbleShape = isOwn
            ? isFirst && isLast ? 'rounded-l-2xl rounded-tr-2xl rounded-br-[5px]'
            : isFirst           ? 'rounded-l-2xl rounded-tr-2xl rounded-br-[5px]'
            : isLast            ? 'rounded-l-2xl rounded-tr-[5px] rounded-br-2xl'
            :                     'rounded-l-2xl rounded-r-[5px]'
            : isFirst && isLast ? 'rounded-r-2xl rounded-tl-2xl rounded-bl-[5px]'
            : isFirst           ? 'rounded-r-2xl rounded-tl-2xl rounded-bl-[5px]'
            : isLast            ? 'rounded-r-2xl rounded-tl-[5px] rounded-bl-2xl'
            :                     'rounded-r-2xl rounded-l-[5px]';

          const timeNode = (
            <>
              <span className={`text-[11px] ${hasMedia ? 'text-white/90' : isOwn ? 'text-[rgba(255,255,255,0.6)]' : 'text-tg-text-secondary'}`}>
                {formatTime(msg.createdAt)}
              </span>
              {isOwn && (
                <MessageStatus
                  messageCreatedAt={msg.createdAt}
                  otherLastReadAt={otherId ? lastReadAt?.[otherId] : undefined}
                />
              )}
            </>
          );

          return (
            <div
              key={msg.id}
              className={`flex w-full select-text animate-slide-in ${isOwn ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-[2px]'}`}
            >
              <div className={`max-w-[75%] md:max-w-[65%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <span className="text-[13px] font-medium text-tg-primary mb-0.5 px-1">
                    {msg.senderName}
                  </span>
                )}

                {hasMedia ? (
                  <MediaBubble
                    msg={msg}
                    isOwn={isOwn}
                    bubbleShape={bubbleShape}
                    timeNode={timeNode}
                    onImageClick={(src, alt) => setLightbox({ src, alt })}
                  />
                ) : (
                  <div className={`relative px-4 py-2 text-[15px] leading-relaxed break-words shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out text-white' : 'bg-tg-msg-in text-tg-text'}`}>
                    <div className="flex flex-wrap items-end gap-2">
                      <span className="whitespace-pre-wrap max-w-full break-words">{msg.content}</span>
                      <span className={`flex items-center gap-1 text-[11px] select-none mt-1 ml-auto ${isOwn ? 'text-[rgba(255,255,255,0.6)]' : 'text-tg-text-secondary'}`}>
                        {timeNode}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {lightbox && (
        <MediaViewer
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
