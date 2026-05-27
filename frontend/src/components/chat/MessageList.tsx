import { useEffect, useRef, useState, useCallback } from 'react';
import { Pencil, Trash2, CornerUpLeft, CheckCheck, Smile, FileText, FileArchive, File as FileIcon, Bookmark } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import type { Message } from '../../types';
import MessageStatus from './MessageStatus';
import MediaViewer from './MediaViewer';
import VoiceMessage from './VoiceMessage';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import EmojiPicker from './EmojiPicker';

function formatReadTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + ' ' + time;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

interface Props {
  conversationId: string;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message, forEveryone: boolean) => void;
  onRead: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onSaveMessage?: (msg: Message) => void;
  searchQuery?: string;
  highlightedMsgId?: string | null;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const EMPTY_MESSAGES: never[] = [];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function isImage(type?: string) { return !!type?.startsWith('image/'); }
function isVideo(type?: string) { return !!type?.startsWith('video/'); }
function isAudio(type?: string) { return !!type?.startsWith('audio/'); }
function isDocument(type?: string) {
  return !!type && !isImage(type) && !isVideo(type) && !isAudio(type);
}

function docIcon(type?: string, name?: string) {
  const lower = (name ?? type ?? '').toLowerCase();
  if (lower.includes('pdf')) return <FileText className="w-8 h-8 text-rose-400 shrink-0" />;
  if (lower.includes('zip') || lower.includes('rar') || lower.includes('archive'))
    return <FileArchive className="w-8 h-8 text-yellow-400 shrink-0" />;
  if (lower.includes('doc') || lower.includes('word'))
    return <FileText className="w-8 h-8 text-blue-400 shrink-0" />;
  if (lower.includes('xls') || lower.includes('sheet'))
    return <FileText className="w-8 h-8 text-green-400 shrink-0" />;
  return <FileIcon className="w-8 h-8 text-tg-text-secondary shrink-0" />;
}

const ownText = { color: 'var(--color-tg-msg-out-text)' } as const;
const ownTextMuted = { color: 'var(--color-tg-msg-out-text-muted)' } as const;

interface MediaBubbleProps {
  msg: Message;
  isOwn: boolean;
  bubbleShape: string;
  timeNode: React.ReactNode;
  onImageClick: (src: string, alt: string) => void;
  replyNode?: React.ReactNode;
}

function MediaBubble({ msg, isOwn, bubbleShape, timeNode, onImageClick, replyNode }: MediaBubbleProps) {
  const hasCaption = msg.content.trim().length > 0;
  const bgClass = isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in';

  return (
    <div className={`overflow-hidden ${bubbleShape} ${bgClass} shadow-sm flex flex-col`}>
      {replyNode}
      {isImage(msg.fileType) && (
        <div className="relative cursor-pointer group" onClick={() => onImageClick(msg.fileUrl!, msg.fileName ?? '')}>
          <img
            src={msg.fileUrl}
            alt={msg.fileName ?? 'image'}
            className="block w-full max-w-xs object-cover group-hover:brightness-95 transition-[filter]"
            loading="lazy"
          />
          {!hasCaption && (
            <div className="absolute bottom-1.5 right-2 bg-black/40 backdrop-blur-[2px] rounded-full px-2 py-0.5 flex items-center gap-1 select-none">
              {timeNode}
            </div>
          )}
        </div>
      )}
      {isVideo(msg.fileType) && (
        <div className="relative">
          <video src={msg.fileUrl} controls className="block w-full max-w-xs max-h-64 bg-black" preload="metadata" />
          {!hasCaption && (
            <div className="absolute bottom-1.5 right-2 bg-black/40 backdrop-blur-[2px] rounded-full px-2 py-0.5 flex items-center gap-1 select-none">
              {timeNode}
            </div>
          )}
        </div>
      )}
      {hasCaption && (
        <div className="px-3.5 pt-1.5 pb-2 flex flex-wrap items-end gap-2">
          <span className="chat-text leading-relaxed break-words whitespace-pre-wrap" style={isOwn ? ownText : undefined}>
            {msg.content}
          </span>
          <span className={`ml-auto flex items-center gap-1 text-[11px] select-none ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
            {timeNode}
          </span>
        </div>
      )}
    </div>
  );
}

/** Highlight search query in text */
export function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="rounded-sm px-[1px]" style={{ background: 'var(--color-tg-primary)', color: 'var(--color-tg-msg-out-text)', opacity: 0.9 }}>{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

export default function MessageList({
  conversationId, onReply, onEdit, onDelete, onRead, onReact, onSaveMessage,
  searchQuery = '', highlightedMsgId, hasMore, loadingMore, onLoadMore,
}: Props) {
  const user = useAuthStore(s => s.user);
  const messages = useChatStore(s => s.messages[conversationId] ?? EMPTY_MESSAGES);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const scrollHeightBeforeRef = useRef(0);
  const scrollTopBeforeRef = useRef(0);
  const prevFirstIdRef = useRef<string | null>(null);
  const initialScrollDoneRef = useRef(false);

  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
  const [emojiPicker, setEmojiPicker] = useState<{ x: number; y: number; msgId: string } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctxPosRef = useRef<{ x: number; y: number } | null>(null);

  // Flash highlight for search
  const [flashId, setFlashId] = useState<string | null>(null);
  useEffect(() => {
    if (!highlightedMsgId) return;
    setFlashId(highlightedMsgId);
    const t = setTimeout(() => setFlashId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightedMsgId]);

  // Track scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Smart scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;
    const firstId = messages[0].id;
    const isPrepend = prevFirstIdRef.current !== null && firstId !== prevFirstIdRef.current;
    if (isPrepend) {
      // Correct formula: preserve user's visual position relative to their anchor
      // new scrollTop = old scrollTop + (new scrollHeight - old scrollHeight)
      container.scrollTop = scrollTopBeforeRef.current + (container.scrollHeight - scrollHeightBeforeRef.current);
    } else if (!initialScrollDoneRef.current) {
      container.scrollTop = container.scrollHeight;
      initialScrollDoneRef.current = true;
    } else if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevFirstIdRef.current = firstId;
  }, [messages]);

  // Reset on conversation switch
  useEffect(() => {
    initialScrollDoneRef.current = false;
    prevFirstIdRef.current = null;
    isAtBottomRef.current = true;
  }, [conversationId]);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container || !onLoadMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loadingMore) {
        // Save both scrollHeight and scrollTop before load so we can restore position accurately
        scrollHeightBeforeRef.current = container.scrollHeight;
        scrollTopBeforeRef.current = container.scrollTop;
        onLoadMore();
      }
    }, {
      root: container,
      // Trigger 400px before the sentinel becomes visible — preload before user reaches top
      rootMargin: '400px 0px 0px 0px',
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  // Read receipt
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
    ctxPosRef.current = { x, y };
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
        icon: <Smile className="w-4 h-4" />,
        label: 'Реакция',
        onClick: () => {
          const pos = ctxPosRef.current;
          setContextMenu(null);
          if (pos) setTimeout(() => setEmojiPicker({ x: pos.x, y: pos.y, msgId: msg.id }), 0);
        },
      });
      items.push({
        icon: <CornerUpLeft className="w-4 h-4" />,
        label: 'Ответить',
        onClick: () => onReply(msg),
      });
    }

    if (onSaveMessage && !msg.deleted) {
      items.push({
        icon: <Bookmark className="w-4 h-4" />,
        label: 'В избранное',
        onClick: () => onSaveMessage(msg),
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
  }, [user?.id, onReply, onEdit, onDelete, onSaveMessage]);

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-4 flex flex-col bg-transparent"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        onScroll={handleScroll}
      >
        <div ref={topSentinelRef} className="shrink-0 h-px" />

        {loadingMore && (
          <div className="flex justify-center py-3 shrink-0">
            <div className="w-5 h-5 border-2 border-tg-primary/30 border-t-tg-primary rounded-full animate-spin" />
          </div>
        )}

        {messages.length === 0 && !loadingMore && (
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
          const hasAudio = !msg.deleted && isAudio(msg.fileType);
          const hasDoc   = !msg.deleted && isDocument(msg.fileType);
          const isFlashing = flashId === msg.id;
          const reactions = msg.reactions ?? {};
          const hasReactions = Object.keys(reactions).length > 0;

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
                <span className={`text-[10px] italic ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>изм.</span>
              )}
              <span
                className={`text-[11px] ${hasMedia ? '' : !isOwn ? 'text-tg-text-secondary' : ''}`}
                style={hasMedia ? { color: 'rgba(255,255,255,0.9)' } : isOwn ? ownTextMuted : undefined}
              >
                {formatTime(msg.createdAt)}
              </span>
              {isOwn && <MessageStatus readAt={msg.readAt} />}
            </>
          );

          return (
            <div
              key={msg.id}
              className={`flex w-full animate-slide-in ${isOwn ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-[2px]'}`}
              data-msg-id={msg.id}
              onContextMenu={(e) => handleContextMenu(e, msg)}
              onTouchStart={(e) => handleTouchStart(e, msg)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
            >
              <div className={`max-w-[75%] md:max-w-[65%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <span className="text-[13px] font-medium text-tg-primary mb-0.5 px-1">{msg.senderName}</span>
                )}

                <div className={`transition-all duration-500 rounded-2xl ${isFlashing ? 'ring-2 ring-tg-primary ring-offset-2 ring-offset-transparent' : ''}`}>
                  {msg.deleted ? (
                    <div className={`relative px-4 py-2 text-[14px] italic shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in'}`}>
                      <div className="flex flex-wrap items-end gap-2">
                        <span className={!isOwn ? 'text-tg-text-secondary' : ''} style={isOwn ? ownTextMuted : undefined}>Сообщение удалено</span>
                        <span className={`flex items-center gap-1 text-[11px] select-none mt-1 ml-auto ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>{timeNode}</span>
                      </div>
                    </div>
                  ) : hasAudio ? (
                    <div className={`shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in'}`} style={isOwn ? ownText : undefined}>
                      <VoiceMessage fileUrl={msg.fileUrl!} seed={msg.id} isOwn={isOwn} />
                      <div className="px-3 pb-1.5 flex justify-end items-center gap-1 text-[11px] select-none -mt-1" style={isOwn ? ownTextMuted : undefined}>
                        <span className={!isOwn ? 'text-tg-text-secondary' : ''}>{formatTime(msg.createdAt)}</span>
                        {isOwn && <MessageStatus readAt={msg.readAt} />}
                      </div>
                    </div>
                  ) : hasDoc ? (
                    /* ── Document bubble ── */
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-3.5 py-2.5 shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in'} hover:opacity-90 transition-opacity no-underline`}
                      onClick={e => e.stopPropagation()}
                    >
                      {docIcon(msg.fileType, msg.fileName)}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate leading-tight" style={isOwn ? ownText : undefined}>
                          {msg.fileName ?? 'Файл'}
                        </div>
                        <div className="text-[11px] mt-0.5" style={isOwn ? ownTextMuted : { color: 'var(--color-tg-text-secondary)' }}>
                          {formatSize(msg.fileSize)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 self-end pb-0.5">
                        <span className={`flex items-center gap-1 text-[11px] select-none ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
                          {timeNode}
                        </span>
                      </div>
                    </a>
                  ) : hasMedia ? (
                    <MediaBubble
                      msg={msg} isOwn={isOwn} bubbleShape={bubbleShape} timeNode={timeNode}
                      onImageClick={(src, alt) => setLightbox({ src, alt })}
                      replyNode={msg.replyToId ? (
                        <div className="px-3 py-1.5 mx-1.5 mt-1.5 rounded-lg bg-black/15 border-l-2 border-tg-primary text-[13px] select-none">
                          <div className="font-semibold text-tg-primary truncate leading-tight">{msg.replyToSenderName}</div>
                          <div className={`truncate mt-0.5 text-xs ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
                            {msg.replyToContent ?? 'Сообщение удалено'}
                          </div>
                        </div>
                      ) : undefined}
                    />
                  ) : (
                    <div
                      className={`relative px-3.5 py-1.5 chat-text leading-relaxed break-words shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in text-tg-text'}`}
                      style={isOwn ? ownText : undefined}
                    >
                      {msg.replyToId && (
                        <div className="mb-1 rounded-lg bg-black/15 border-l-2 border-tg-primary px-2.5 py-1 text-[13px] select-none">
                          <div className="font-semibold text-tg-primary truncate leading-tight">{msg.replyToSenderName}</div>
                          <div className={`truncate mt-0.5 text-xs ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
                            {msg.replyToContent ?? 'Сообщение удалено'}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap items-end gap-2 select-text">
                        <span className="whitespace-pre-wrap max-w-full break-words">
                          <Highlighted text={msg.content} query={searchQuery} />
                        </span>
                        <span className={`flex items-center gap-1 text-[11px] select-none mt-1 ml-auto ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
                          {timeNode}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reaction pills */}
                {hasReactions && (
                  <div className={`flex flex-wrap gap-1 mt-1 px-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(reactions).map(([emoji, userIds]) => {
                      const mine = userIds.includes(user?.id ?? '');
                      return (
                        <button
                          key={emoji}
                          onClick={() => onReact(msg.id, emoji)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] transition-colors cursor-pointer border select-none
                            ${mine
                              ? 'bg-tg-primary/20 border-tg-primary/60 text-tg-primary'
                              : 'bg-tg-input-bg border-tg-border text-tg-text hover:bg-tg-hover'}`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[11px] font-semibold tabular-nums">{userIds.length}</span>
                        </button>
                      );
                    })}
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

      {emojiPicker && (
        <EmojiPicker
          x={emojiPicker.x}
          y={emojiPicker.y}
          onSelect={(emoji) => onReact(emojiPicker.msgId, emoji)}
          onClose={() => setEmojiPicker(null)}
        />
      )}

      {lightbox && (
        <MediaViewer src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}
