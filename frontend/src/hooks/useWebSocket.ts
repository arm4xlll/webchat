import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore, type FontSize } from '../store/themeStore';
import { getConversations, getMessagesAfter } from '../api/conversations';
import type { Attachment, Message, MessageEvent, PresenceEvent, ReadReceiptEvent, TypingEvent, User } from '../types';

export function useWebSocket() {
  const stompClientRef = useRef<Client | null>(null);
  const subscribedConvsRef = useRef<Set<string>>(new Set());
  const subscriptionsRef = useRef<StompSubscription[]>([]);
  const accessToken = useAuthStore(s => s.accessToken);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const { addMessage, updateMessage, addConversation, updateConversationMember, setTyping, clearAllTyping, setLastReadAt, setPresence, conversations } = useChatStore();
  const applyFromServer = useThemeStore(s => s.applyFromServer);

  const subscribeToConversation = useCallback((client: Client, convId: string) => {
    if (subscribedConvsRef.current.has(convId)) return;
    subscribedConvsRef.current.add(convId);

    const s1 = client.subscribe(`/topic/conversation.${convId}`, (frame: IMessage) => {
      try {
        addMessage(JSON.parse(frame.body) as Message);
      } catch (e) {
        console.error('[WS] Failed to parse message', e);
      }
    });

    const s2 = client.subscribe(`/topic/conversation.${convId}.typing`, (frame: IMessage) => {
      try {
        const ev: TypingEvent = JSON.parse(frame.body);
        setTyping(ev.conversationId, ev.userId, ev.username, ev.typing);
      } catch (e) {
        console.error('[WS] Failed to parse typing event', e);
      }
    });

    const s3 = client.subscribe(`/topic/conversation.${convId}.read`, (frame: IMessage) => {
      try {
        const ev: ReadReceiptEvent = JSON.parse(frame.body);
        setLastReadAt(ev.conversationId, ev.readerUserId, ev.lastReadAt);
        // Mark messages as read in the local store (for sender's own messages)
        useChatStore.getState().markMessagesReadAt(ev.conversationId, ev.readerUserId, ev.lastReadAt);
      } catch (e) {
        console.error('[WS] Failed to parse read receipt', e);
      }
    });

    const s4 = client.subscribe(`/topic/conversation.${convId}.event`, (frame: IMessage) => {
      try {
        const ev: MessageEvent = JSON.parse(frame.body);
        if (ev.type === 'EDITED' || ev.type === 'DELETED') {
          updateMessage(ev.message);
        }
      } catch (e) {
        console.error('[WS] Failed to parse message event', e);
      }
    });

    const s5 = client.subscribe(`/topic/conversation.${convId}.presence`, (frame: IMessage) => {
      try {
        const ev: PresenceEvent = JSON.parse(frame.body);
        setPresence(ev.userId, ev.online, ev.lastSeenAt);
      } catch (e) {
        console.error('[WS] Failed to parse presence event', e);
      }
    });

    const s6 = client.subscribe(`/topic/conversation.${convId}.member_updated`, (frame: IMessage) => {
      try {
        const member = JSON.parse(frame.body) as User;
        updateConversationMember(member);
      } catch (e) {
        console.error('[WS] Failed to parse member update', e);
      }
    });

    subscriptionsRef.current.push(s1, s2, s3, s4, s5, s6);
    console.log('[WS] Subscribed to conversation', convId);
  }, [addMessage, updateMessage, updateConversationMember, setTyping, setLastReadAt, setPresence]);

  useEffect(() => {
    if (!accessToken) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws/sockjs'),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        console.log('[WS] Connected');
        setWsStatus('connected');
        subscribedConvsRef.current.clear();
        subscriptionsRef.current = [];
        clearAllTyping();

        // Подписки на user-specific очереди — СНАЧАЛА, до топиков разговоров
        const newConvSub = client.subscribe('/user/queue/conversations', (frame: IMessage) => {
          try {
            const conv = JSON.parse(frame.body);
            addConversation(conv);
            subscribeToConversation(client, conv.id);
          } catch (e) {
            console.error('[WS] Failed to parse new conversation', e);
          }
        });

        // Очередь для снапшота presence (массив) и реалтайм-событий (одиночный объект)
        const presenceQueueSub = client.subscribe('/user/queue/presence', (frame: IMessage) => {
          try {
            const data = JSON.parse(frame.body);
            const events: PresenceEvent[] = Array.isArray(data) ? data : [data];
            events.forEach(ev => useChatStore.getState().setPresence(ev.userId, ev.online, ev.lastSeenAt));
          } catch (e) {
            console.error('[WS] Failed to parse presence queue', e);
          }
        });

        // Синхронизация темы с другого устройства
        const settingsQueueSub = client.subscribe('/user/queue/settings', (frame: IMessage) => {
          try {
            const user = JSON.parse(frame.body);
            if (user.settings) {
              const s = JSON.parse(user.settings);
              if (s.themeId && s.fontSize) {
                applyFromServer(s.themeId, s.fontSize as FontSize);
              }
            }
          } catch (e) {
            console.error('[WS] Failed to parse settings update', e);
          }
        });

        subscriptionsRef.current.push(newConvSub, presenceQueueSub, settingsQueueSub);

        // Загружаем разговоры, подписываемся на топики, потом запрашиваем presence-снапшот
        getConversations().then(convs => {
          useChatStore.getState().setConversations(convs);
          convs.forEach(c => subscribeToConversation(client, c.id));

          // Запрашиваем текущий presence всех контактов — ответ придёт в /user/queue/presence
          client.publish({ destination: '/app/presence.sync', body: '{}' });

          // Догружаем пропущенные сообщения
          const cachedMessages = useChatStore.getState().messages;
          convs.forEach(c => {
            const msgs = cachedMessages[c.id];
            if (!msgs || msgs.length === 0) return;
            const lastAt = msgs[msgs.length - 1].createdAt;
            getMessagesAfter(c.id, lastAt)
              .then(newMsgs => newMsgs.forEach(m => useChatStore.getState().addMessage(m)))
              .catch(console.error);
          });
        }).catch(console.error);
      },

      onDisconnect: () => {
        console.log('[WS] Disconnected — will reconnect');
        setWsStatus('connecting');
        subscribedConvsRef.current.clear();
        subscriptionsRef.current = [];
      },

      onStompError: (frame) => {
        console.error('[WS] STOMP error', frame);
        setWsStatus('connecting');
      },

      onWebSocketError: (error) => {
        console.error('[WS] WebSocket error', error);
        setWsStatus('connecting');
      },

      onWebSocketClose: () => {
        console.log('[WS] WebSocket closed — reconnecting');
        setWsStatus('connecting');
        subscribedConvsRef.current.clear();
        subscriptionsRef.current = [];
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable, safe to use in cleanup
      subscribedConvsRef.current.clear();
      subscriptionsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- addConversation, clearAllTyping, subscribeToConversation are stable callbacks; re-running on each render would reconnect the socket
  }, [accessToken]);

  useEffect(() => {
    const client = stompClientRef.current;
    if (!client?.connected) return;
    conversations.forEach(c => subscribeToConversation(client, c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  const sendMessage = useCallback((
    conversationId: string,
    content: string,
    attachment?: Attachment,
    replyToId?: string
  ) => {
    const client = stompClientRef.current;
    if (!client?.connected) {
      console.warn('[WS] Not connected');
      return;
    }
    client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ conversationId, content, ...attachment, replyToId }),
    });
  }, []);

  const sendTyping = useCallback((conversationId: string, typing: boolean) => {
    const client = stompClientRef.current;
    if (!client?.connected) return;
    client.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({ conversationId, typing }),
    });
  }, []);

  const sendReadReceipt = useCallback((conversationId: string) => {
    const client = stompClientRef.current;
    if (!client?.connected) return;
    client.publish({
      destination: '/app/chat.read',
      body: JSON.stringify({ conversationId }),
    });
  }, []);

  return { sendMessage, sendTyping, sendReadReceipt, wsStatus };
}
