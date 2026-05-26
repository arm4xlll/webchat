import { useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getMessages } from '../../api/conversations';
import type { Conversation } from '../../types';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import MessageInput from './MessageInput';
import { ArrowLeft } from 'lucide-react';

interface Props {
  conversation: Conversation;
  onSend: (content: string) => void;
  onTyping: (typing: boolean) => void;
  onRead: () => void;
  onBack?: () => void;
}

function getOtherMember(conv: Conversation, myId: string) {
  return conv.members.find(m => m.id !== myId) ?? conv.members[0];
}

export default function ChatWindow({ conversation, onSend, onTyping, onRead, onBack }: Props) {
  const user = useAuthStore(s => s.user);
  const { setMessages, messages } = useChatStore();
  const other = user ? getOtherMember(conversation, user.id) : null;

  useEffect(() => {
    if (messages[conversation.id] !== undefined) return;
    getMessages(conversation.id).then(msgs => setMessages(conversation.id, msgs));
  }, [conversation.id]);

  // Read receipt при открытии чата и при каждом новом сообщении пока чат открыт
  useEffect(() => {
    onRead();
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
        <div className="w-10 h-10 rounded-full bg-tg-primary text-white flex items-center justify-center font-medium text-base shrink-0 select-none">
          {other?.name[0].toUpperCase() ?? '?'}
        </div>
        <div>
          <div className="font-medium text-[15px] text-tg-text leading-none mb-1">{other?.name ?? 'Чат'}</div>
          <div className="text-xs text-tg-text-secondary">@{other?.username ?? ''}</div>
        </div>
      </div>

      <MessageList conversationId={conversation.id} conversation={conversation} />
      <TypingIndicator conversationId={conversation.id} />
      <MessageInput onSend={onSend} onTyping={onTyping} />
    </div>
  );
}

