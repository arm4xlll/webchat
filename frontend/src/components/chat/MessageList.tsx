import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  FileText, FileArchive, File as FileIcon,
  Check, CheckCheck, Smile, CornerUpLeft, Copy, Pin, PinOff, Bookmark, Pencil, Trash2, ChevronDown,
} from 'lucide-react';
import type { Message } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import EmojiPicker from './EmojiPicker';
import MediaViewer from './MediaViewer';
import VoiceMessage from './VoiceMessage';
import { isStickerMessage, isStickerVideoType } from '../../types/sticker';
import { addPin, removePin } from '../../api/pins';
import LinkPreviewCard from './LinkPreviewCard';
import { extractFirstUrl } from '../../api/linkPreview';
import { useTranslation } from '../../hooks/useTranslation';

function formatReadTime(iso: string, lang: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'short' }) + ' ' + time;
}

function formatSize(bytes?: number, lang: string = 'ru'): string {
  if (!bytes) return '';
  if (lang === 'ru') {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  } else {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

interface Props {
  conversationId: string;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message, forEveryone: boolean) => void;
  onRead: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onSaveMessage?: (msg: Message) => void;
  onStickerClick?: (fileUrl: string, fileType: string) => void;
  searchQuery?: string;
  highlightedMsgId?: string | null;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const EMPTY_MESSAGES: never[] = [];
const EMPTY_PINS: never[] = [];

function keyOf(msg: Message): string {
  return msg.clientId ?? msg.id;
}

function formatTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

function formatDividerDate(iso: string, lang: string, t: any) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return t('chat.today');
  if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  if (d.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return d.toLocaleDateString(lang, options);
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
        <div className="px-3.5 pt-1.5 pb-2 relative">
          <span className="chat-text leading-relaxed break-words whitespace-pre-wrap inline" style={isOwn ? ownText : undefined}>
            {msg.content}
          </span>
          <span className={`inline-block ${isOwn ? 'w-14' : 'w-10'}`}></span>
          <span className={`absolute bottom-1.5 right-2 flex items-center gap-1 text-[11px] select-none ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
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
  conversationId, onReply, onEdit, onDelete, onRead, onReact, onSaveMessage, onStickerClick,
  searchQuery = '', highlightedMsgId, hasMore, loadingMore, onLoadMore,
}: Props) {
  const { t, language } = useTranslation();
  const user = useAuthStore(s => s.user);
  const messages = useChatStore(s => s.messages[conversationId] ?? EMPTY_MESSAGES);
  const pins = useChatStore(s => s.pins[conversationId]) ?? EMPTY_PINS;

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const scrollHeightBeforeRef = useRef(0);
  const scrollTopBeforeRef = useRef(0);
  const prevConvIdRef = useRef<string | null>(null);
  const prevNewestKeyRef = useRef<string | null>(null);
  const prevOldestKeyRef = useRef<string | null>(null);

  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const onReadRef = useRef(onRead);
  useLayoutEffect(() => { onReadRef.current = onRead; });

  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRead = useCallback(() => {
    if (readTimerRef.current) clearTimeout(readTimerRef.current);
    readTimerRef.current = setTimeout(() => onReadRef.current(), 300);
  }, []);

  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
  const [emojiPicker, setEmojiPicker] = useState<{ x: number; y: number; msgId: string } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctxPosRef = useRef<{ x: number; y: number } | null>(null);

  const [flashId, setFlashId] = useState<string | null>(null);
  useEffect(() => {
    if (!highlightedMsgId) return;
    setFlashId(highlightedMsgId);
    const t = setTimeout(() => setFlashId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightedMsgId]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollTop < 120;
    isAtBottomRef.current = isNearBottom;
    setShowScrollDown(!isNearBottom);
    if (isNearBottom) setNewMessagesCount(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ top: 0, behavior: 'smooth' });
    setNewMessagesCount(0);
    setShowScrollDown(false);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const newestKey = keyOf(reversedMessages[0]);
    const oldestKey = keyOf(reversedMessages[reversedMessages.length - 1]);

    if (prevConvIdRef.current !== conversationId) {
      prevConvIdRef.current  = conversationId;
      prevNewestKeyRef.current = newestKey;
      prevOldestKeyRef.current = oldestKey;
      isAtBottomRef.current  = true;
      setNewMessagesCount(0);
      setShowScrollDown(false);
      container.scrollTop = 0;
      scheduleRead();
      return;
    }

    const isOlderLoaded = oldestKey !== prevOldestKeyRef.current && prevOldestKeyRef.current !== null;
    const isNewMsg      = !isOlderLoaded && newestKey !== prevNewestKeyRef.current && prevNewestKeyRef.current !== null;

    if (isOlderLoaded) {
      const delta = container.scrollHeight - scrollHeightBeforeRef.current;
      container.scrollTop = scrollTopBeforeRef.current + delta;
    } else if (isNewMsg) {
      const isOwnMsg = reversedMessages[0].senderId === user?.id;
      if (isOwnMsg || isAtBottomRef.current) {
        isAtBottomRef.current = true;
        setNewMessagesCount(0);
        setShowScrollDown(false);
        container.scrollTop = 0;
        scheduleRead();
      } else {
        setNewMessagesCount(c => c + 1);
      }
    }

    prevNewestKeyRef.current = newestKey;
    prevOldestKeyRef.current = oldestKey;
  }, [messages, reversedMessages, conversationId, scheduleRead, user?.id]);

  useEffect(() => () => {
    if (readTimerRef.current) clearTimeout(readTimerRef.current);
  }, [conversationId]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let wasAtBottom = false;
    let prevHeight = vv.height;
    const handler = () => {
      const delta = vv.height - prevHeight;
      prevHeight = vv.height;
      if (delta < -80) {
        wasAtBottom = isAtBottomRef.current;
      } else if (delta > 80 && wasAtBottom) {
        const c = containerRef.current;
        if (c) c.scrollTop = 0;
      }
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container || !onLoadMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loadingMore) {
        scrollHeightBeforeRef.current = container.scrollHeight;
        scrollTopBeforeRef.current = container.scrollTop;
        onLoadMore();
      }
    }, {
      root: container,
      rootMargin: '400px 0px 0px 0px',
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onReadRef.current();
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [conversationId]);

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

  const myUserId = user?.id;
  const lastReadTimeStr = useChatStore(s => s.lastReadAt[conversationId]?.[myUserId ?? '']);

  const firstUnreadIdx = useMemo(() => {
    if (!lastReadTimeStr || !myUserId) return -1;
    const lastReadTime = new Date(lastReadTimeStr).getTime();
    return messages.findIndex(m =>
      m.senderId !== myUserId &&
      !m.deleted &&
      new Date(m.createdAt).getTime() > lastReadTime
    );
  }, [messages, lastReadTimeStr, myUserId]);

  const reversedUnreadIdx = useMemo(
    () => firstUnreadIdx === -1 ? -1 : messages.length - 1 - firstUnreadIdx,
    [firstUnreadIdx, messages.length]
  );

  const buildMenuItems = useCallback((msg: Message): ContextMenuItem[] => {
    const isOwn = msg.senderId === user?.id;
    const items: ContextMenuItem[] = [];

    if (!msg.deleted) {
      items.push({
        icon: <Smile className="w-4 h-4" />,
        label: t('chat.reaction'),
        onClick: () => {
          const pos = ctxPosRef.current;
          setContextMenu(null);
          if (pos) setTimeout(() => setEmojiPicker({ x: pos.x, y: pos.y, msgId: msg.id }), 0);
        },
      });
      items.push({
        icon: <CornerUpLeft className="w-4 h-4" />,
        label: t('chat.reply'),
        onClick: () => onReply(msg),
      });
      items.push({
        icon: <Copy className="w-4 h-4" />,
        label: t('chat.copyText'),
        onClick: () => { navigator.clipboard.writeText(msg.content); },
      });

      const existingPin = pins.find(p => p.messageId === msg.id);
      if (existingPin) {
        const canUnpin = existingPin.pinnedByUserId === user?.id || !existingPin.pinnedForAll;
        if (canUnpin) {
          items.push({
            icon: <PinOff className="w-4 h-4" />,
            label: t('chat.unpin'),
            onClick: () => {
              removePin(conversationId, existingPin.id)
                .then(() => useChatStore.getState().removePin(conversationId, existingPin.id))
                .catch(e => console.error('[Unpin] failed', e));
            },
          });
        }
      } else {
        items.push({
          icon: <Pin className="w-4 h-4" />,
          label: t('chat.pinForMyself'),
          onClick: () => {
            addPin(conversationId, msg.id, false)
              .then(pin => useChatStore.getState().addPin(pin))
              .catch(e => console.error('[Pin] failed', e));
          },
        });
        items.push({
          icon: <Pin className="w-4 h-4" />,
          label: t('chat.pinForEveryone'),
          onClick: () => {
            addPin(conversationId, msg.id, true)
              .then(pin => useChatStore.getState().addPin(pin))
              .catch(e => console.error('[Pin] failed', e));
          },
        });
      }
    }

    if (onSaveMessage && !msg.deleted) {
      items.push({
        icon: <Bookmark className="w-4 h-4" />,
        label: t('chat.toSavedMessages'),
        onClick: () => onSaveMessage(msg),
      });
    }

    if (isOwn && !msg.deleted) {
      items.push({
        icon: <Pencil className="w-4 h-4" />,
        label: t('chat.edit'),
        onClick: () => onEdit(msg),
      });
      items.push({
        icon: <Trash2 className="w-4 h-4" />,
        label: t('chat.deleteForMyself'),
        onClick: () => onDelete(msg, false),
        danger: true,
      });
      items.push({
        icon: <Trash2 className="w-4 h-4" />,
        label: t('chat.deleteForEveryone'),
        onClick: () => onDelete(msg, true),
        danger: true,
      });
      if (msg.readAt) {
        items.push({
          icon: <CheckCheck className="w-4 h-4" />,
          label: t('chat.readAtTime', { time: formatReadTime(msg.readAt, language) }),
          onClick: () => {},
          info: true,
        });
      }
    }

    return items;
  }, [user?.id, onReply, onEdit, onDelete, onSaveMessage, conversationId, pins, t, language]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 flex flex-col-reverse bg-transparent"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', overflowAnchor: 'none' }}
        onScroll={handleScroll}
      >
        {/* ── Visual BOTTOM anchor (first DOM child) ── */}
        <div ref={bottomRef} className="h-4 shrink-0" />

        {reversedMessages.map((msg, i) => {
          const newerMsg = reversedMessages[i - 1]; // newer, visual below
          const olderMsg = reversedMessages[i + 1]; // older, visual above

          const isOwn    = msg.senderId === user?.id;
          const isFirst  = !olderMsg || olderMsg.senderId !== msg.senderId;
          const isLast   = !newerMsg || newerMsg.senderId !== msg.senderId;

          const isSticker  = !msg.deleted && isStickerMessage(msg.fileUrl, msg.fileName);
          const hasMedia   = !msg.deleted && !isSticker && (isImage(msg.fileType) || isVideo(msg.fileType));
          const hasAudio   = !msg.deleted && isAudio(msg.fileType);
          const hasDoc     = !msg.deleted && !isSticker && isDocument(msg.fileType);
          const isFlashing = flashId === msg.id;
          const reactions  = msg.reactions ?? {};
          const hasReactions = Object.keys(reactions).length > 0;
          const firstUrl   = !msg.deleted ? extractFirstUrl(msg.content) : null;

          const showDateDivider = !olderMsg ||
            new Date(olderMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

          const bubbleShape = isOwn
            ? isFirst && isLast ? 'rounded-2xl msg-tail-out'
            : isFirst           ? 'rounded-l-2xl rounded-tr-2xl rounded-br-[5px]'
            : isLast            ? 'rounded-l-2xl rounded-tr-[5px] rounded-b-2xl msg-tail-out'
            :                     'rounded-l-2xl rounded-r-[5px]'
            : isFirst && isLast ? 'rounded-2xl msg-tail-in'
            : isFirst           ? 'rounded-r-2xl rounded-tl-2xl rounded-bl-[5px]'
            : isLast            ? 'rounded-r-2xl rounded-tl-[5px] rounded-b-2xl msg-tail-in'
            :                     'rounded-r-2xl rounded-l-[5px]';

          const timeNode = (
            <>
              {msg.editedAt && !msg.deleted && (
                <span className={`text-[10px] italic ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
                  {language === 'ru' ? 'изм.' : 'edited'}
                </span>
              )}
              <span
                className={`text-[11px] ${hasMedia ? '' : !isOwn ? 'text-tg-text-secondary' : ''}`}
                style={hasMedia ? { color: 'rgba(255,255,255,0.9)' } : isOwn ? ownTextMuted : undefined}
              >
                {formatTime(msg.createdAt, language)}
              </span>
              {isOwn && <MessageStatus readAt={msg.readAt} pending={msg.pending} failed={msg.failed} />}
            </>
          );

          return (
            <div key={keyOf(msg)} className="contents">
              {/* Message bubble — first in contents = visual BOTTOM of this group */}
              <div
                className={`flex w-full animate-slide-in ${isOwn ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-[2px]'}`}
                data-msg-id={msg.id}
                onContextMenu={(e) => handleContextMenu(e, msg)}
                onTouchStart={(e) => handleTouchStart(e, msg)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                <div className={`max-w-[75%] md:max-w-[65%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className={`transition-all duration-500 rounded-2xl ${isFlashing ? 'ring-2 ring-tg-primary ring-offset-2 ring-offset-transparent' : ''}`}>
                    {msg.deleted ? (
                      <div className={`relative px-4 py-2 text-[14px] italic shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in'}`}>
                        <div className="flex flex-wrap items-end gap-2">
                          <span className={!isOwn ? 'text-tg-text-secondary' : ''} style={isOwn ? ownTextMuted : undefined}>{t('chat.messageDeleted')}</span>
                          <span className={`flex items-center gap-1 text-[11px] select-none mt-1 ml-auto ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>{timeNode}</span>
                        </div>
                      </div>
                    ) : hasAudio ? (
                      <div className={`shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in'}`} style={isOwn ? ownText : undefined}>
                        <VoiceMessage fileUrl={msg.fileUrl!} seed={msg.id} isOwn={isOwn} />
                        <div className="px-3 pb-1.5 flex justify-end items-center gap-1 text-[11px] select-none -mt-1" style={isOwn ? ownTextMuted : undefined}>
                          <span className={!isOwn ? 'text-tg-text-secondary' : ''}>{formatTime(msg.createdAt, language)}</span>
                          {isOwn && <MessageStatus readAt={msg.readAt} pending={msg.pending} failed={msg.failed} />}
                        </div>
                      </div>
                    ) : isSticker ? (
                      <div
                        className="relative inline-block group select-none cursor-pointer"
                        onClick={() => onStickerClick?.(msg.fileUrl!, msg.fileType ?? '')}
                        title={t('stickers.viewStickerPack')}
                      >
                        {isStickerVideoType(msg.fileType ?? '') ? (
                          <video
                            src={msg.fileUrl}
                            className="w-40 h-40 object-contain"
                            autoPlay loop muted playsInline preload="metadata"
                          />
                        ) : (
                          <img
                            src={msg.fileUrl}
                            alt="sticker"
                            className="w-40 h-40 object-contain group-hover:scale-105 transition-transform duration-150"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/40 backdrop-blur-[2px] rounded-full px-1.5 py-0.5 flex items-center gap-1 select-none opacity-70 group-hover:opacity-100 transition-opacity">
                          {timeNode}
                        </div>
                      </div>
                    ) : hasDoc ? (
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
                            {msg.fileName ?? t('chat.file')}
                          </div>
                          <div className="text-[11px] mt-0.5" style={isOwn ? ownTextMuted : { color: 'var(--color-tg-text-secondary)' }}>
                            {formatSize(msg.fileSize, language)}
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
                              {msg.replyToContent ?? t('chat.messageDeleted')}
                            </div>
                          </div>
                        ) : undefined}
                      />
                    ) : (
                      <div
                        className={`relative px-3.5 pt-1.5 pb-2 chat-text leading-relaxed break-words shadow-sm ${bubbleShape} ${isOwn ? 'bg-tg-msg-out' : 'bg-tg-msg-in text-tg-text'}`}
                        style={isOwn ? ownText : undefined}
                      >
                        {msg.replyToId && (
                          <div className="mb-1 rounded-lg bg-black/15 border-l-2 border-tg-primary px-2.5 py-1 text-[13px] select-none">
                            <div className="font-semibold text-tg-primary truncate leading-tight">{msg.replyToSenderName}</div>
                            <div className={`truncate mt-0.5 text-xs ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
                              {msg.replyToContent ?? t('chat.messageDeleted')}
                            </div>
                          </div>
                        )}
                        <div className="select-text">
                          <span className="whitespace-pre-wrap max-w-full break-words inline">
                            <Highlighted text={msg.content} query={searchQuery} />
                          </span>
                          {firstUrl && (
                            <div className="mt-1 block">
                              <LinkPreviewCard url={firstUrl} isOwn={isOwn} />
                            </div>
                          )}
                          <span className={`inline-block ${isOwn ? 'w-14' : 'w-10'}`}></span>
                          <span className={`absolute bottom-1.5 right-2 flex items-center gap-1 text-[11px] select-none ${!isOwn ? 'text-tg-text-secondary' : ''}`} style={isOwn ? ownTextMuted : undefined}>
                            {timeNode}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

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

              {i === reversedUnreadIdx && (
                <div className="flex items-center my-4 select-none shrink-0" data-new-messages-sentinel="true">
                  <div className="flex-1 h-px bg-rose-500/30" />
                  <span className="mx-4 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                    {t('chat.newMessages')}
                  </span>
                  <div className="flex-1 h-px bg-rose-500/30" />
                </div>
              )}

              {showDateDivider && (
                <div className="flex justify-center my-3 select-none shrink-0">
                  <div className="bg-tg-input-bg/70 backdrop-blur-[2px] text-tg-text-secondary text-[12px] font-medium px-3 py-1 rounded-full border border-tg-border/30">
                    {formatDividerDate(msg.createdAt, language, t)}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loadingMore && (
          <div className="flex justify-center py-3 shrink-0">
            <div className="w-5 h-5 border-2 border-tg-primary/30 border-t-tg-primary rounded-full animate-spin" />
          </div>
        )}

        {messages.length === 0 && !loadingMore && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="bg-tg-input-bg text-tg-text-secondary text-[15px] px-4 py-1.5 rounded-full select-none">
              {t('chat.emptyState')}
            </div>
          </div>
        )}

        <div ref={topSentinelRef} className="shrink-0 h-px" />
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

      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-tg-sidebar-bg border border-tg-border text-tg-primary shadow-lg flex items-center justify-center hover:bg-tg-hover hover:scale-105 transition-all cursor-pointer z-20 group"
        >
          <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
          {newMessagesCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-tg-primary text-white text-[11px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center border border-tg-sidebar-bg">
              {newMessagesCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function MessageStatus({ readAt, pending, failed }: { readAt?: string; pending?: boolean; failed?: boolean }) {
  if (failed) return <span className="text-rose-400 font-bold shrink-0">!</span>;
  if (pending) return <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin shrink-0" />;
  if (readAt) return <CheckCheck className="w-3.5 h-3.5 shrink-0" />;
  return <Check className="w-3.5 h-3.5 shrink-0" />;
}
