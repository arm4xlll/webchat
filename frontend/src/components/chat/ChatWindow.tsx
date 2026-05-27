import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getMessages } from '../../api/conversations';
import type { Attachment, Conversation, Message } from '../../types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserAvatar from '../common/UserAvatar';
import UserProfileModal from '../profile/UserProfileModal';
import { ArrowLeft, Search, X, ChevronUp, ChevronDown, Upload } from 'lucide-react';

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

interface Props {
  conversation: Conversation;
  onSend: (content: string, attachment?: Attachment, replyToId?: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string, forEveryone: boolean) => void;
  onTyping: (typing: boolean) => void;
  onRead: () => void;
  onBack?: () => void;
}

function getOtherMember(conv: Conversation, myId: string) {
  return conv.members.find(m => m.id !== myId) ?? conv.members[0];
}

const EMPTY_TYPING: never[] = [];

export default function ChatWindow({ conversation, onSend, onEditMessage, onDeleteMessage, onTyping, onRead, onBack }: Props) {
  const user = useAuthStore(s => s.user);
  const { setMessages, messages } = useChatStore();
  const typingUsers = useChatStore(s => s.typingUsers[conversation.id] ?? EMPTY_TYPING);
  const presenceStatus = useChatStore(s => s.presenceStatus);
  const other = user ? getOtherMember(conversation, user.id) : null;
  const otherPresence = other ? presenceStatus[other.id] : undefined;

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // ── Search ───────────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const convMessages = messages[conversation.id] ?? [];

  useEffect(() => {
    if (!searchQuery.trim()) { setMatchIds([]); return; }
    const q = searchQuery.toLowerCase();
    const ids = convMessages
      .filter(m => !m.deleted && m.content.toLowerCase().includes(q))
      .map(m => m.id);
    setMatchIds(ids);
    setMatchIndex(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, convMessages.length]);

  useEffect(() => {
    if (matchIds.length === 0) return;
    const id = matchIds[matchIndex];
    document.querySelector(`[data-msg-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [matchIds, matchIndex]);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setMatchIds([]);
  };

  const goNext = () => setMatchIndex(i => (i + 1) % matchIds.length);
  const goPrev = () => setMatchIndex(i => (i - 1 + matchIds.length) % matchIds.length);

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
    const file = e.dataTransfer.files[0];
    if (file) setDroppedFile(file);
  }, []);

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages[conversation.id] !== undefined) return;
    getMessages(conversation.id).then(msgs => setMessages(conversation.id, msgs));
    setSearchQuery('');
    setMatchIds([]);
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
        <button onClick={() => other && setProfileOpen(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-tg-hover rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer">
          <UserAvatar name={other?.name ?? '?'} avatarUrl={other?.avatarUrl} size="md" />
          <div className="flex flex-col justify-center min-w-0">
            <div className="font-semibold text-[15.5px] text-tg-text leading-tight">{other?.name ?? 'Чат'}</div>
            {typingUsers.length > 0 ? (
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
            )}
          </div>
        </button>

        {/* Search toggle */}
        <button onClick={searchOpen ? closeSearch : openSearch}
          className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${searchOpen ? 'text-tg-primary bg-tg-primary/15' : 'text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover'}`}>
          <Search className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 py-2 bg-tg-sidebar-bg border-b border-tg-border flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-tg-text-secondary shrink-0" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') closeSearch(); if (e.key === 'Enter') goNext(); }}
            placeholder="Поиск по сообщениям..."
            className="flex-1 bg-transparent text-tg-text placeholder:text-tg-text-secondary text-[14px] outline-none"
          />
          {searchQuery && (
            <>
              <span className="text-[12px] text-tg-text-secondary shrink-0 tabular-nums">
                {matchIds.length > 0 ? `${matchIndex + 1}/${matchIds.length}` : '0'}
              </span>
              <button onClick={goPrev} disabled={matchIds.length === 0} className="p-1 text-tg-text-secondary hover:text-tg-text disabled:opacity-30 cursor-pointer">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={goNext} disabled={matchIds.length === 0} className="p-1 text-tg-text-secondary hover:text-tg-text disabled:opacity-30 cursor-pointer">
                <ChevronDown className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={closeSearch} className="p-1 text-tg-text-secondary hover:text-tg-text cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <MessageList
        conversationId={conversation.id}
        searchQuery={searchQuery}
        onReply={(msg) => { setReplyingTo(msg); setEditingMessage(null); }}
        onEdit={(msg) => { setEditingMessage(msg); setReplyingTo(null); }}
        onDelete={(msg, all) => onDeleteMessage(msg.id, all)}
        onRead={onRead}
      />

      <MessageInput
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

      {/* Drag overlay */}
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

      {other && (
        <UserProfileModal user={other} presence={otherPresence} isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
