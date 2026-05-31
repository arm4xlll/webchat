import { useEffect, useRef, useCallback } from 'react';
import EventSource from 'react-native-sse';
import { API_BASE } from '../constants';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { getConversations } from '../api/conversations';

export function useEventStream() {
  const esRef = useRef<EventSource | null>(null);
  const retryDelay = useRef(2000);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const { addMessage, updateMessage, removeMessage, setTyping, setPresence, setConversations, addConversation, updateConversationLastMessage, incrementUnread, activeConversationId } = useChatStore();
  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;

  const connect = useCallback(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token || !mounted.current) return;

    esRef.current?.close();

    const es = new EventSource(`${API_BASE}/events/stream`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    es.addEventListener('stream.ready', async () => {
      retryDelay.current = 2000;
      try {
        const convs = await getConversations();
        setConversations(convs);
      } catch {}
    });

    es.addEventListener('message.created', (e: any) => {
      const msg = JSON.parse(e.data);
      addMessage(msg);
      updateConversationLastMessage(msg.conversationId, msg.createdAt, msg.content, msg.senderName);
      if (msg.conversationId !== activeIdRef.current) {
        incrementUnread(msg.conversationId);
      }
    });

    es.addEventListener('message.updated', (e: any) => {
      updateMessage(JSON.parse(e.data));
    });

    es.addEventListener('message.deleted', (e: any) => {
      const { conversationId, messageId } = JSON.parse(e.data);
      removeMessage(conversationId, messageId);
    });

    es.addEventListener('message.reaction', (e: any) => {
      updateMessage(JSON.parse(e.data));
    });

    es.addEventListener('conversation.typing', (e: any) => {
      const { conversationId, userId, username, typing } = JSON.parse(e.data);
      setTyping(conversationId, userId, username, typing);
    });

    es.addEventListener('conversation.created', (e: any) => {
      addConversation(JSON.parse(e.data));
    });

    es.addEventListener('presence.update', (e: any) => {
      const { userId, online, lastSeenAt } = JSON.parse(e.data);
      setPresence(userId, online, lastSeenAt);
    });

    es.addEventListener('presence.snapshot', (e: any) => {
      const list: Array<{ userId: number; online: boolean; lastSeenAt?: string }> = JSON.parse(e.data);
      list.forEach(({ userId, online, lastSeenAt }) => setPresence(userId, online, lastSeenAt));
    });

    es.addEventListener('error', () => {
      if (!mounted.current) return;
      es.close();
      retryTimer.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000);
        connect();
      }, retryDelay.current);
    });

    esRef.current = es;
  }, []);

  useEffect(() => {
    mounted.current = true;
    connect();
    return () => {
      mounted.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      esRef.current?.close();
    };
  }, [connect]);
}
