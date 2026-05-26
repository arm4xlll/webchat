import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { getConversations } from '../api/conversations';
import { logout } from '../api/auth';
import UserSearch from '../components/sidebar/UserSearch';
import ConversationList from '../components/sidebar/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import { LogOut, MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const user = useAuthStore(s => s.user);
  const doLogout = useAuthStore(s => s.logout);
  const { conversations, activeConversationId, setConversations, setActiveConversation } = useChatStore();
  const { sendMessage, sendTyping, sendReadReceipt } = useWebSocket();

  useEffect(() => {
    getConversations().then(setConversations);
  }, []);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    doLogout();
  };

  return (
    <div className="flex h-screen w-full bg-tg-bg text-tg-text overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar — на мобильном скрывается когда открыт чат */}
      <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[350px] bg-tg-sidebar-bg border-r border-tg-border shrink-0 safe-top`}>
        {/* User header */}
        <div className="px-4 pt-4 pb-3 border-b border-tg-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tg-primary text-white flex items-center justify-center font-semibold text-base shrink-0 select-none">
            {user?.name[0].toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-tg-text truncate">
              {user?.name}
            </div>
            <div className="text-xs text-tg-text-secondary truncate">@{user?.username}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Выйти"
            className="p-2 text-tg-text-secondary hover:text-white hover:bg-tg-hover rounded-full cursor-pointer transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <UserSearch />
        <ConversationList />
      </div>

      {/* Chat area — на мобильном скрывается когда нет активного чата */}
      <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden bg-tg-bg relative`}>
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            onSend={content => sendMessage(activeConversationId!, content)}
            onTyping={typing => sendTyping(activeConversationId!, typing)}
            onRead={() => sendReadReceipt(activeConversationId!)}
            onBack={() => setActiveConversation(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="inline-flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-tg-input-bg flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-tg-text-secondary" />
              </div>
              <p className="text-sm text-tg-text-secondary bg-tg-input-bg px-4 py-1.5 rounded-full">
                Выберите чат, чтобы начать общение
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
