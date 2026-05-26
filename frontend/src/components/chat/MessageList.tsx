import { useEffect, useRef, useState, useCallback } from 'react';
import { Pencil, Trash2, CornerUpLeft, CheckCheck } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import type { Conversation, Message } from '../../types';
import MessageStatus from './MessageStatus';
import MediaViewer from './MediaViewer';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';

function formatReadTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + ' ' + time;
}

interface Props {
  conversationId: string;
  conversation: Conversation;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message, forEveryone: boolean) => void;
  onRead: () => void;
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

export default function MessageList({ conversationId, conversation, onReply, onEdit, onDelete, onRead }: Props) {
  const user = useAuthStore(s => s.user);
  const messages = useChatStore(s => s.messages[conversationId] ?? EMPTY_MESSAGES);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send read receipt only when bottom of the list is actually visible
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onRead();
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onRead]);

  const openContextMenu = useCallback((x: number, y: number, msg: Message) => {
    setContextMenu({ x, y, msg });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, msg);
  }, [openContextMenu]);

  const handleTouchStart = useCallback((e: React.TouchEvent, msg: Message) => {
    const touch = e.touches[0];
    longPressRef.current = setTimeout(() => {
      openContextMenu(touch.clientX, touch.clientY, msg);
    }, 500);
  }, [openContextMenu]);

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const buildMenuItems = useCallback((msg: Message): ContextMenuItem[] => {
    const isOwn = msg.senderId === user?.id;
    const items: ContextMenuItem[] = [];

    if (!msg.deleted) {
      items.push({
        icon: <CornerUpLeft className="w-4 h-4" />,
        label: 'Ответить',
        onClick: () => onReply(msg),
      });
    }

    if (isOwn && !msg.deleted) {
      items.push({
        icon: <Pencil className="w-4 h-4" />,
        label: 'Редактировать',
        onClick: () => onEdit(msg),
      });
      items.push({
        icon: <Trash2 className="w-4 h-4" />,
        label: 'Удалить у себя',
        onClick: () => onDelete(msg, false),
        danger: true,
      });
      items.push({
        icon: <Trash2 className="w-4 h-4" />,
        label: 'Удалить у всех',
        onClick: () => onDelete(msg, true),
        danger: true,
      });

      if (msg.readAt) {
        items.push({
          icon: <CheckCheck className="w-4 h-4" />,
          label: `Прочитано в ${formatReadTime(msg.readAt)}`,
          onClick: () => {},
          info: true,
        });
      }
    }

    return items;
  }, [user?.id, onReply, onEdit, onDelete]);

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
          const hasMedia = !msg.deleted && (isImage(msg.fileType) || isVideo(msg.fileType));

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
              {msg.editedAt && !msg.deleted && (
                <span className={`text-[10px] italic ${isOwn ? 'text-[rgba(255,255,255,0.5)]' : 'text-tg-text-secondary'}`}>
                  изм.
                </span>
              )}
              <span className={`text-[11px] ${hasMedia ? 'text-white/90' : isOwn ? 'text-[rgba(255,255,255,0.6)]' : 'text-tg-text-secondary'}`}>
                {formatTime(msg.createdAt)}
              </span>
              {isOwn && (
                <MessageStatus readAt={msg.readAt} />
              )}
            </>
          );

          return (
            <div
              key={msg.id}
              className={`flex w-full select-text animate-slide-in ${isOwn ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-[2px]'}`}
              onContextMenu={(e) => handleContextMenu(e, msg)}
              onTouchStart={(e) => handleTouchStart(e, msg)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
            >
              <div className={`max-w-[75%] md:max-w-[65%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <span className="text-[13px] font-medium text-tg-primary mb-0.5 px-1">
                    {msg.senderName}
                  </span>
                )}

                {msg.deleted ? (
                  <div className={`relative px-4 py-2 text-[14px] italic shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in'}`}>
                    <div className="flex flex-wrap items-end gap-2">
                      <span className={`${isOwn ? 'text-[rgba(255,255,255,0.5)]' : 'text-tg-text-secondary'}`}>
                        Сообщение удалено
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] select-none mt-1 ml-auto ${isOwn ? 'text-[rgba(255,255,255,0.45)]' : 'text-tg-text-secondary'}`}>
                        {timeNode}
                      </span>
                    </div>
                  </div>
                ) : hasMedia ? (
                  <div className="flex flex-col w-full">
                    {msg.replyToId && (
                      <ReplyQuote
                        senderName={msg.replyToSenderName ?? ''}
                        content={msg.replyToContent ?? null}
                        isOwn={isOwn}
                        attached
                      />
                    )}
                    <MediaBubble
                      msg={msg}
                      isOwn={isOwn}
                      bubbleShape={msg.replyToId ? (isOwn ? 'rounded-l-2xl rounded-r-[5px]' : 'rounded-r-2xl rounded-l-[5px]') : bubbleShape}
                      timeNode={timeNode}
                      onImageClick={(src, alt) => setLightbox({ src, alt })}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col w-full">
                    {msg.replyToId && (
                      <ReplyQuote
                        senderName={msg.replyToSenderName ?? ''}
                        content={msg.replyToContent ?? null}
                        isOwn={isOwn}
                        attached
                      />
                    )}
                    <div className={`relative px-4 py-2 text-[15px] leading-relaxed break-words shadow-sm ${msg.replyToId ? (isOwn ? 'rounded-l-2xl rounded-r-[5px]' : 'rounded-r-2xl rounded-l-[5px]') : bubbleShape} ${isOwn ? 'bg-tg-msg-out text-white' : 'bg-tg-msg-in text-tg-text'}`}>
                      <div className="flex flex-wrap items-end gap-2">
                        <span className="whitespace-pre-wrap max-w-full break-words">{msg.content}</span>
                        <span className={`flex items-center gap-1 text-[11px] select-none mt-1 ml-auto ${isOwn ? 'text-[rgba(255,255,255,0.6)]' : 'text-tg-text-secondary'}`}>
                          {timeNode}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems(contextMenu.msg)}
          onClose={() => setContextMenu(null)}
        />
      )}

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

interface ReplyQuoteProps {
  senderName: string;
  content: string | null;
  isOwn: boolean;
  attached?: boolean;
}

function ReplyQuote({ senderName, content, isOwn, attached }: ReplyQuoteProps) {
  return (
    <div className={`
      px-3 pt-2 pb-1 text-[13px] border-l-2 border-tg-primary
      ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in'}
      ${attached
        ? isOwn
          ? 'rounded-l-2xl rounded-tr-2xl rounded-br-none'
          : 'rounded-r-2xl rounded-tl-2xl rounded-bl-none'
        : 'rounded-xl'}
    `}>
      <div className="font-medium text-tg-primary truncate">{senderName}</div>
      <div className={`truncate mt-0.5 ${isOwn ? 'text-[rgba(255,255,255,0.6)]' : 'text-tg-text-secondary'}`}>
        {content ?? 'Сообщение удалено'}
      </div>
    </div>
  );
}
