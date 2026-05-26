import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { getConversations, editMessage as editMessageAPI, deleteMessage as deleteMessageAPI } from '../api/conversations';
import { logout } from '../api/auth';
import UserSearch from '../components/sidebar/UserSearch';
import ConversationList from '../components/sidebar/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import { LogOut, MessageSquare, WifiOff, Loader2, Bell } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function ChatPage() {
  const { showBanner, requestPermission } = usePushNotifications();
  const user = useAuthStore(s => s.user);
  const doLogout = useAuthStore(s => s.logout);
  const { conversations, activeConversationId, setConversations, setActiveConversation, updateMessage, removeMessage } = useChatStore();
  const { sendMessage, sendTyping, sendReadReceipt, wsStatus } = useWebSocket();

  useEffect(() => {
    getConversations().then(setConversations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error(e); }
    doLogout();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-tg-bg text-tg-text overflow-hidden" style={{ height: '100dvh' }}>
      {/* Баннер разрешения на уведомления */}
      {showBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-tg-primary/15 text-sm shrink-0">
          <div className="flex items-center gap-2 text-tg-text">
            <Bell className="w-4 h-4 text-tg-primary shrink-0" />
            <span>Включите уведомления, чтобы не пропускать сообщения</span>
          </div>
          <button
            onClick={requestPermission}
            className="shrink-0 px-3 py-1 rounded-full bg-tg-primary text-white text-xs font-medium hover:bg-tg-primary/80 transition-colors cursor-pointer"
          >
            Включить
          </button>
        </div>
      )}
      {/* Индикатор соединения — показывается только когда нет связи */}
      {wsStatus !== 'connected' && (
        <div className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium select-none shrink-0 transition-all ${
          wsStatus === 'connecting'
            ? 'bg-yellow-500/15 text-yellow-400'
            : 'bg-rose-500/15 text-rose-400'
        }`}>
          {wsStatus === 'connecting' ? (
            <><Loader2 className="w-3 h-3 animate-spin" />Подключение...</>
          ) : (
            <><WifiOff className="w-3 h-3" />Нет соединения — переподключение...</>
          )}
        </div>
      )}
      {/* Основной layout */}
      <div className="flex flex-1 overflow-hidden">

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
            onSend={(content, attachment, replyToId) => sendMessage(activeConversationId!, content, attachment, replyToId)}
            onEditMessage={async (msgId, newContent) => {
              try {
                const updated = await editMessageAPI(activeConversationId!, msgId, newContent);
                updateMessage(updated);
              } catch (e) { console.error('Edit failed', e); }
            }}
            onDeleteMessage={async (msgId, forEveryone) => {
              try {
                await deleteMessageAPI(activeConversationId!, msgId, forEveryone);
                if (!forEveryone) removeMessage(activeConversationId!, msgId);
                // forEveryone: broadcast via WS will update the store automatically
              } catch (e) { console.error('Delete failed', e); }
            }}
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

      </div>{/* /основной layout */}
    </div>
  );
}
