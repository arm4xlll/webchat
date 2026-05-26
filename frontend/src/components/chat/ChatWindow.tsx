import { useState, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getMessages } from '../../api/conversations';
import type { Attachment, Conversation, Message } from '../../types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserAvatar from '../common/UserAvatar';
import UserProfileModal from '../profile/UserProfileModal';
import { ArrowLeft } from 'lucide-react';

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

  useEffect(() => {
    if (messages[conversation.id] !== undefined) return;
    getMessages(conversation.id).then(msgs => setMessages(conversation.id, msgs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  // Read receipt при открытии чата и при каждом новом сообщении пока чат открыт
  useEffect(() => {
    onRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, messages[conversation.id]?.length]);

  return (
    <div className="flex flex-col h-full bg-tg-bg relative overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 bg-tg-sidebar-bg border-b border-tg-border flex items-center gap-3 relative z-10 safe-top">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-1 text-tg-text-secondary hover:text-white hover:bg-tg-hover rounded-full transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => other && setProfileOpen(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-tg-hover rounded-xl px-1 py-1 transition-colors cursor-pointer"
        >
          <UserAvatar name={other?.name ?? '?'} avatarUrl={other?.avatarUrl} size="md" />
          <div>
            <div className="font-medium text-[15px] text-tg-text leading-none mb-1">{other?.name ?? 'Чат'}</div>
            {typingUsers.length > 0 ? (
              <div className="flex items-center gap-1.5 h-3.5 text-[13px] text-tg-primary animate-slide-in">
                <span className="flex items-center gap-0.5">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-tg-primary inline-block" style={{
                      animation: 'bounce 1.2s infinite',
                      animationDelay: `${i * 0.2}s`
                    }} />
                  ))}
                </span>
                <span>{typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'печатает...' : 'печатают...'}</span>
                <style>{`
                  @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-2px); opacity: 1; }
                  }
                `}</style>
              </div>
            ) : otherPresence?.online ? (
              <div className="flex items-center gap-1 h-3.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span className="text-[13px] text-green-400 leading-none">в сети</span>
              </div>
            ) : otherPresence?.lastSeenAt ? (
              <div className="text-[13px] h-3.5 text-tg-text-secondary leading-none">
                был(а) {formatLastSeen(otherPresence.lastSeenAt)}
              </div>
            ) : (
              <div className="text-[13px] h-3.5 text-tg-text-secondary leading-none">не в сети</div>
            )}
          </div>
        </button>
      </div>

      <MessageList
        conversationId={conversation.id}
        conversation={conversation}
        onReply={(msg) => { setReplyingTo(msg); setEditingMessage(null); }}
        onEdit={(msg) => { setEditingMessage(msg); setReplyingTo(null); }}
        onDelete={(msg, all) => onDeleteMessage(msg.id, all)}
      />
      
      <MessageInput
        onSend={(content, attachment) => {
          if (editingMessage) {
            onEditMessage(editingMessage.id, content);
            setEditingMessage(null);
          } else {
            onSend(content, attachment, replyingTo?.id);
            setReplyingTo(null);
          }
        }}
        onTyping={onTyping}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
      />

      {other && (
        <UserProfileModal
          user={other}
          presence={otherPresence}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}
