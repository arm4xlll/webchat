import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore, type FontSize } from '../store/themeStore';
import { useEventStream } from '../hooks/useEventStream';
import {
  getConversations, editMessage as editMessageAPI, deleteMessage as deleteMessageAPI,
  getSavedConversation,
} from '../api/conversations';
import { getMe } from '../api/users';
import { logout } from '../api/auth';
import type { Attachment, Message } from '../types';
import UserSearch from '../components/sidebar/UserSearch';
import ConversationList from '../components/sidebar/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import UserAvatar from '../components/common/UserAvatar';
import SettingsModal from '../components/settings/SettingsModal';
import { LogOut, MessageSquare, WifiOff, Loader2, Bell, Settings, RefreshCw } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useVersionCheck } from '../hooks/useVersionCheck';

export default function ChatPage() {
  const { showBanner, requestPermission } = usePushNotifications();
  const { updateReady, countdown, reloadNow } = useVersionCheck();
  const user = useAuthStore(s => s.user);
  const doLogout = useAuthStore(s => s.logout);
  const conversations = useChatStore(s => s.conversations);
  const activeConversationId = useChatStore(s => s.activeConversationId);
  const setConversations = useChatStore(s => s.setConversations);
  const setActiveConversation = useChatStore(s => s.setActiveConversation);
  const updateMessage = useChatStore(s => s.updateMessage);
  const removeMessage = useChatStore(s => s.removeMessage);
  const addConversation = useChatStore(s => s.addConversation);
  const { sendMessage, sendTyping, sendReadReceipt, sendReaction, wsStatus } = useEventStream();
  const applyFromServer = useThemeStore(s => s.applyFromServer);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Saved conversation ────────────────────────────────────────────────────
  const [savedConvId, setSavedConvId] = useState<string | null>(null);

  useEffect(() => {
    getMe().then(me => {
      if (me.settings) {
        try {
          const s = JSON.parse(me.settings);
          if (s.themeId && s.fontSize) applyFromServer(s.themeId, s.fontSize as FontSize);
        } catch { /* ignore */ }
      }
    }).catch(console.error);

    getConversations().then(setConversations);

    // Ensure saved conversation exists and add to list
    getSavedConversation().then(conv => {
      setSavedConvId(conv.id);
      addConversation(conv);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wsStatus === 'connected' && activeConversationId) {
      sendReadReceipt(activeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsStatus, activeConversationId]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error(e); }
    doLogout();
  };

  const handleRead = useCallback(() => {
    if (activeConversationId) sendReadReceipt(activeConversationId);
  }, [activeConversationId, sendReadReceipt]);

  /** Forward a message to the saved conversation */
  const handleSaveMessage = useCallback((msg: Message) => {
    if (!savedConvId) return;
    // Build a forwarded message: content + file if any
    const attachment: Attachment | undefined = msg.fileUrl ? {
      fileUrl: msg.fileUrl,
      fileName: msg.fileName ?? '',
      fileType: msg.fileType ?? 'application/octet-stream',
      fileSize: msg.fileSize ?? 0,
    } : undefined;
    sendMessage(savedConvId, msg.content, attachment);
  }, [savedConvId, sendMessage]);

  return (
    <div className="flex flex-col h-screen w-full bg-tg-bg text-tg-text overflow-hidden" style={{ height: '100dvh' }}>
      {updateReady && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-emerald-500/15 text-sm shrink-0">
          <div className="flex items-center gap-2 text-tg-text">
            <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Доступна новая версия — обновление через {countdown} с</span>
          </div>
          <button onClick={reloadNow}
            className="shrink-0 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-400 transition-colors cursor-pointer">
            Обновить
          </button>
        </div>
      )}

      {showBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-tg-primary/15 text-sm shrink-0">
          <div className="flex items-center gap-2 text-tg-text">
            <Bell className="w-4 h-4 text-tg-primary shrink-0" />
            <span>Включите уведомления, чтобы не пропускать сообщения</span>
          </div>
          <button onClick={requestPermission}
            className="shrink-0 px-3 py-1 rounded-full bg-tg-primary text-white text-xs font-medium hover:bg-tg-primary/80 transition-colors cursor-pointer">
            Включить
          </button>
        </div>
      )}

      {wsStatus !== 'connected' && (
        <div className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium select-none shrink-0 transition-all ${
          wsStatus === 'connecting' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-rose-500/15 text-rose-400'
        }`}>
          {wsStatus === 'connecting'
            ? <><Loader2 className="w-3 h-3 animate-spin" />Подключение...</>
            : <><WifiOff className="w-3 h-3" />Нет соединения — переподключение...</>}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[350px] bg-tg-sidebar-bg border-r border-tg-border shrink-0 safe-top`}>
          <div className="px-3.5 pt-3 pb-2.5 border-b border-tg-border flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-tg-hover rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              <UserAvatar name={user?.name ?? '?'} avatarUrl={user?.avatarUrl} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14.5px] text-tg-text truncate leading-tight">{user?.name}</div>
                <div className="text-[12.5px] text-tg-text-secondary truncate mt-0.5">@{user?.username}</div>
              </div>
            </button>
            <button onClick={() => setSettingsOpen(true)} title="Настройки"
              className="p-2 text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover rounded-full cursor-pointer transition-colors">
              <Settings className="w-4.5 h-4.5" />
            </button>
            <button onClick={handleLogout} title="Выйти"
              className="p-2 text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover rounded-full cursor-pointer transition-colors">
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>

          <UserSearch />
          <ConversationList />
        </div>

        {/* Chat area */}
        <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden bg-tg-bg relative`}>
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              onSend={(content, attachment, replyToId) =>
                sendMessage(activeConversationId!, content, attachment, replyToId)}
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
                } catch (e) { console.error('Delete failed', e); }
              }}
              onTyping={typing => sendTyping(activeConversationId!, typing)}
              onRead={handleRead}
              onReact={(msgId, emoji) => sendReaction(msgId, emoji)}
              onSaveMessage={activeConversation.type !== 'saved' ? handleSaveMessage : undefined}
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

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
