import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getMessages, searchMessages } from '../../api/conversations';
import type { Attachment, Conversation, Message } from '../../types';
import MessageList, { Highlighted } from './MessageList';
import MessageInput from './MessageInput';
import UserAvatar from '../common/UserAvatar';
import UserProfileModal from '../profile/UserProfileModal';
import { ArrowLeft, Search, X, ChevronUp, ChevronDown, Upload, Bookmark } from 'lucide-react';
import PinnedBanner from './PinnedBanner';
import { removePin } from '../../api/pins';

const PAGE_SIZE = 50;

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  conversation: Conversation;
  onSend: (content: string, attachment?: Attachment, replyToId?: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string, forEveryone: boolean) => void;
  onTyping: (typing: boolean) => void;
  onRead: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onSaveMessage?: (msg: Message) => void;
  onBack?: () => void;
}

function getOtherMember(conv: Conversation, myId: string) {
  return conv.members.find(m => m.id !== myId) ?? conv.members[0];
}

const EMPTY_TYPING: never[] = [];

export default function ChatWindow({
  conversation, onSend, onEditMessage, onDeleteMessage,
  onTyping, onRead, onReact, onSaveMessage, onBack,
}: Props) {
  const user = useAuthStore(s => s.user);
  const { setMessages, prependMessages, messages } = useChatStore();
  // Get the raw list from the store (stable reference when unchanged),
  // then filter outside the selector — .filter() always returns a new array,
  // so putting it inside the selector causes infinite re-renders (React #185).
  const allTypingUsers = useChatStore(s => s.typingUsers[conversation.id] ?? EMPTY_TYPING);
  const typingUsers = allTypingUsers.filter(u => u.userId !== user?.id);
  const presenceStatus = useChatStore(s => s.presenceStatus);
  const isSaved = conversation.type === 'saved';
  const other = user ? (isSaved ? user : getOtherMember(conversation, user.id)) : null;
  const otherPresence = (other && !isSaved) ? presenceStatus[other.id] : undefined;

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const pins = useChatStore(s => s.pins[conversation.id] ?? []);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const older = await getMessages(conversation.id, nextPage, PAGE_SIZE);
      if (older.length === 0) {
        setHasMore(false);
      } else {
        prependMessages(conversation.id, older);
        setPage(nextPage);
        if (older.length < PAGE_SIZE) setHasMore(false);
      }
    } catch (e) {
      console.error('[Pagination] Failed to load older messages', e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, conversation.id, prependMessages]);

  // ── Search ───────────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const convMessages = messages[conversation.id] ?? [];

  const [searchResults, setSearchResults] = useState<Message[]>([]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setMatchIds([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const msgs = await searchMessages(conversation.id, q, 0, 50);
        setSearchResults(msgs);
        const ids = msgs.map(m => m.id);
        setMatchIds(ids);
        setMatchIndex(0);
        setShowDropdown(ids.length > 0);
      } catch (e) {
        console.error('[Search] Backend search failed', e);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, conversation.id]);

  const scrollToMatch = useCallback((id: string) => {
    const el = document.querySelector(`[data-msg-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(id);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  }, []);

  const jumpToMessage = useCallback(async (messageId: string, _messageCreatedAt: string) => {
    const exists = convMessages.some(m => m.id === messageId);
    if (exists) {
      scrollToMatch(messageId);
      return;
    }

    let currentPage = page;
    let found = false;
    setLoadingMore(true);
    try {
      while (currentPage < 10) { // Limit to 10 pages
        const nextPage = currentPage + 1;
        const older = await getMessages(conversation.id, nextPage, PAGE_SIZE);
        if (older.length === 0) break;
        
        prependMessages(conversation.id, older);
        currentPage = nextPage;
        setPage(nextPage);
        
        if (older.some(m => m.id === messageId)) {
          found = true;
          break;
        }
        if (older.length < PAGE_SIZE) break;
      }
      if (found) {
        setTimeout(() => scrollToMatch(messageId), 100);
      } else {
        console.warn('Message not found within loaded pages');
      }
    } catch (e) {
      console.error('[JumpToMessage] failed', e);
    } finally {
      setLoadingMore(false);
    }
  }, [convMessages, conversation.id, page, prependMessages, scrollToMatch]);

  const handleSelectMatch = useCallback((idx: number) => {
    setMatchIndex(idx);
    setShowDropdown(false);
    const target = searchResults[idx];
    if (target) jumpToMessage(target.id, target.createdAt);
  }, [searchResults, jumpToMessage]);

  const goNext = useCallback(() => {
    if (matchIds.length === 0) return;
    const next = (matchIndex + 1) % matchIds.length;
    setMatchIndex(next);
    setShowDropdown(false);
    const target = searchResults[next];
    if (target) jumpToMessage(target.id, target.createdAt);
  }, [matchIds, matchIndex, searchResults, jumpToMessage]);

  const goPrev = useCallback(() => {
    if (matchIds.length === 0) return;
    const prev = (matchIndex - 1 + matchIds.length) % matchIds.length;
    setMatchIndex(prev);
    setShowDropdown(false);
    const target = searchResults[prev];
    if (target) jumpToMessage(target.id, target.createdAt);
  }, [matchIds, matchIndex, searchResults, jumpToMessage]);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setMatchIds([]);
    setShowDropdown(false);
    setHighlightedMsgId(null);
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);
  const dragCountRef = useRef(0);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    if (e.dataTransfer.items.length > 0) setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    dragCountRef.current--;
    if (dragCountRef.current === 0) setDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setDroppedFile(f);
  }, []);

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setLoadingMore(false);
    setSearchQuery('');
    setMatchIds([]);
    setShowDropdown(false);
    setHighlightedMsgId(null);

    if (messages[conversation.id] !== undefined) return;
    getMessages(conversation.id, 0, PAGE_SIZE).then(msgs => {
      // Merge with messages already in store (may have arrived via WS while fetch was in-flight)
      const inStore = useChatStore.getState().messages[conversation.id] ?? [];
      if (inStore.length === 0) {
        setMessages(conversation.id, msgs);
      } else {
        const storeIds = new Set(inStore.map(m => m.id));
        const toAdd = msgs.filter(m => !storeIds.has(m.id));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...inStore].sort(
            (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
          );
          setMessages(conversation.id, merged);
        }
        // else store already has everything (all came via WS) — keep as is
      }
      if (msgs.length < PAGE_SIZE) setHasMore(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  return (
    <div
      className="flex flex-col h-full bg-tg-bg relative overflow-hidden"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="px-4 md:px-5 py-2.5 bg-tg-sidebar-bg border-b border-tg-border flex items-center gap-2.5 relative z-10 safe-top shrink-0">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 -ml-1 text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover rounded-full transition-colors cursor-pointer shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => !isSaved && other && setProfileOpen(true)}
          className={`flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl px-2.5 py-1.5 transition-colors ${!isSaved ? 'hover:bg-tg-hover cursor-pointer' : 'cursor-default'}`}
        >
          {isSaved ? (
            <div className="w-10 h-10 shrink-0 rounded-full bg-tg-primary flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-white" />
            </div>
          ) : (
            <UserAvatar name={other?.name ?? '?'} avatarUrl={other?.avatarUrl} size="md" />
          )}
          <div className="flex flex-col justify-center min-w-0">
            <div className="font-semibold text-[15.5px] text-tg-text leading-tight">
              {isSaved ? 'Избранное' : (other?.name ?? 'Чат')}
            </div>
            {!isSaved && (
              typingUsers.length > 0 ? (
                <div className="flex items-center gap-1.5 text-[13px] text-tg-primary animate-slide-in mt-0.5">
                  <span className="flex items-center gap-0.5 shrink-0">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1 h-1 rounded-full bg-tg-primary inline-block"
                        style={{ animation: 'bounce 1.2s infinite', animationDelay: `${i*0.2}s` }} />
                    ))}
                  </span>
                  <span className="truncate">{typingUsers.map(u=>u.username).join(', ')} {typingUsers.length===1?'печатает...':'печатают...'}</span>
                  <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-2px);opacity:1}}`}</style>
                </div>
              ) : otherPresence?.online ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="text-[13px] text-green-400">в сети</span>
                </div>
              ) : otherPresence?.lastSeenAt ? (
                <div className="text-[13px] text-tg-text-secondary mt-0.5">был(а) {formatLastSeen(otherPresence.lastSeenAt)}</div>
              ) : (
                <div className="text-[13px] text-tg-text-secondary mt-0.5">не в сети</div>
              )
            )}
            {isSaved && (
              <div className="text-[13px] text-tg-text-secondary mt-0.5">Ваши сохранённые сообщения</div>
            )}
          </div>
        </button>

        <button onClick={searchOpen ? closeSearch : openSearch}
          className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${searchOpen ? 'text-tg-primary bg-tg-primary/15' : 'text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover'}`}>
          <Search className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Pinned Banner */}
      <PinnedBanner
        pins={pins}
        currentUserId={user?.id}
        onJumpTo={(msgId) => {
          const pin = pins.find(p => p.messageId === msgId);
          if (pin) jumpToMessage(msgId, pin.messageSentAt);
        }}
        onUnpin={(pinId) => {
          removePin(conversation.id, pinId)
            .then(() => useChatStore.getState().removePin(conversation.id, pinId))
            .catch(e => console.error('[Unpin] failed', e));
        }}
      />

      {/* Search bar + dropdown */}
      {searchOpen && (
        <div className="relative z-20 shrink-0">
          <div className="px-4 py-2 bg-tg-sidebar-bg border-b border-tg-border flex items-center gap-2">
            <Search className="w-4 h-4 text-tg-text-secondary shrink-0" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onKeyDown={e => {
                if (e.key === 'Escape') closeSearch();
                if (e.key === 'Enter') { e.preventDefault(); goNext(); }
                if (e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
                if (e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
              }}
              onFocus={() => matchIds.length > 0 && setShowDropdown(true)}
              placeholder="Поиск по сообщениям..."
              className="flex-1 bg-transparent text-tg-text placeholder:text-tg-text-secondary text-[14px] outline-none"
            />
            {searchQuery && (
              <>
                <span className="text-[12px] text-tg-text-secondary shrink-0 tabular-nums">
                  {matchIds.length > 0 ? `${matchIndex + 1}/${matchIds.length}` : '0'}
                </span>
                <button onClick={goPrev} disabled={matchIds.length === 0}
                  className="p-1 text-tg-text-secondary hover:text-tg-text disabled:opacity-30 cursor-pointer">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={goNext} disabled={matchIds.length === 0}
                  className="p-1 text-tg-text-secondary hover:text-tg-text disabled:opacity-30 cursor-pointer">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={closeSearch} className="p-1 text-tg-text-secondary hover:text-tg-text cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {showDropdown && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full bg-tg-sidebar-bg border-b border-tg-border shadow-xl max-h-72 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-[13px] text-tg-text-secondary">Ничего не найдено</div>
              ) : searchResults.map((msg, idx) => {
                return (
                  <button
                    key={msg.id}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectMatch(idx); }}
                    className={`w-full px-4 py-2.5 flex items-start gap-3 text-left transition-colors hover:bg-tg-hover ${idx === matchIndex ? 'bg-tg-primary/10' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-tg-primary truncate leading-tight">{msg.senderName}</div>
                      <div className="text-[13px] text-tg-text truncate mt-0.5">
                        <Highlighted text={msg.content} query={searchQuery} />
                      </div>
                    </div>
                    <div className="text-[11px] text-tg-text-secondary shrink-0 mt-0.5">{formatTime(msg.createdAt)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <MessageList
        conversationId={conversation.id}
        searchQuery={searchQuery}
        highlightedMsgId={highlightedMsgId}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
        onReply={(msg) => { setReplyingTo(msg); setEditingMessage(null); }}
        onEdit={(msg) => { setEditingMessage(msg); setReplyingTo(null); }}
        onDelete={(msg, all) => onDeleteMessage(msg.id, all)}
        onRead={onRead}
        onReact={onReact}
        onSaveMessage={onSaveMessage}
      />

      <MessageInput
        conversationId={conversation.id}
        onSend={(content, attachment) => {
          if (editingMessage) { onEditMessage(editingMessage.id, content); setEditingMessage(null); }
          else { onSend(content, attachment, replyingTo?.id); setReplyingTo(null); }
        }}
        onTyping={onTyping}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
        externalFile={droppedFile}
        onExternalFileConsumed={() => setDroppedFile(null)}
      />

      {dragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-tg-primary/10 backdrop-blur-[2px] border-2 border-dashed border-tg-primary rounded-none" />
          <div className="relative z-10 flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-tg-sidebar-bg border border-tg-border shadow-2xl">
            <Upload className="w-10 h-10 text-tg-primary" />
            <span className="text-[16px] font-semibold text-tg-text">Отпустите для прикрепления</span>
            <span className="text-[13px] text-tg-text-secondary">Файл будет добавлен к сообщению</span>
          </div>
        </div>
      )}

      {!isSaved && other && (
        <UserProfileModal user={other} presence={otherPresence} isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
