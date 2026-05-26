import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { Message, ReadReceiptEvent, TypingEvent } from '../types';

export function useWebSocket() {
  const stompClientRef = useRef<Client | null>(null);
  const subscribedConvsRef = useRef<Set<string>>(new Set());
  const subscriptionsRef = useRef<StompSubscription[]>([]);
  const accessToken = useAuthStore(s => s.accessToken);
  const { addMessage, setTyping, setLastReadAt, conversations } = useChatStore();

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
      } catch (e) {
        console.error('[WS] Failed to parse read receipt', e);
      }
    });

    subscriptionsRef.current.push(s1, s2, s3);
    console.log('[WS] Subscribed to conversation', convId);
  }, [addMessage, setTyping, setLastReadAt]);

  useEffect(() => {
    if (!accessToken) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('[WS] Connected');
        subscribedConvsRef.current.clear();
        subscriptionsRef.current = [];
        useChatStore.getState().conversations.forEach(c => {
          subscribeToConversation(client, c.id);
        });
      },

      onDisconnect: () => {
        console.log('[WS] Disconnected');
        subscribedConvsRef.current.clear();
        subscriptionsRef.current = [];
      },

      onStompError: (frame) => {
        console.error('[WS] STOMP error', frame);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
      subscribedConvsRef.current.clear();
      subscriptionsRef.current = [];
    };
  }, [accessToken]);

  // Subscribe to new conversations when the list updates
  useEffect(() => {
    const client = stompClientRef.current;
    if (!client?.connected) return;
    conversations.forEach(c => subscribeToConversation(client, c.id));
  }, [conversations, subscribeToConversation]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const client = stompClientRef.current;
    if (!client?.connected) {
      console.warn('[WS] Not connected');
      return;
    }
    client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ conversationId, content }),
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

  return { sendMessage, sendTyping, sendReadReceipt };
}
