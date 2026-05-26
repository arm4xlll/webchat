import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { Attachment, Message, MessageEvent, ReadReceiptEvent, TypingEvent } from '../types';

export function useWebSocket() {
  const stompClientRef = useRef<Client | null>(null);
  const subscribedConvsRef = useRef<Set<string>>(new Set());
  const subscriptionsRef = useRef<StompSubscription[]>([]);
  const accessToken = useAuthStore(s => s.accessToken);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const { addMessage, updateMessage, addConversation, setTyping, setLastReadAt, conversations } = useChatStore();

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

    subscriptionsRef.current.push(s1, s2, s3, s4);
    console.log('[WS] Subscribed to conversation', convId);
  }, [addMessage, updateMessage, setTyping, setLastReadAt]);

  useEffect(() => {
    if (!accessToken) return;

    const brokerUrl = import.meta.env.DEV 
      ? 'ws://localhost:8080/ws' 
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

    const client = new Client({
      brokerURL: brokerUrl,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        console.log('[WS] Connected to', brokerUrl);
        setWsStatus('connected');
        subscribedConvsRef.current.clear();
        subscriptionsRef.current = [];
        useChatStore.getState().conversations.forEach(c => {
          subscribeToConversation(client, c.id);
        });

        const newConvSub = client.subscribe('/user/queue/conversations', (frame: IMessage) => {
          try {
            const conv = JSON.parse(frame.body);
            addConversation(conv);
            subscribeToConversation(client, conv.id);
          } catch (e) {
            console.error('[WS] Failed to parse new conversation', e);
          }
        });
        subscriptionsRef.current.push(newConvSub);
      },

      onDisconnect: () => {
        console.log('[WS] Disconnected');
        setWsStatus('disconnected');
        subscribedConvsRef.current.clear();
        subscriptionsRef.current = [];
      },

      onStompError: (frame) => {
        console.error('[WS] STOMP error', frame);
        setWsStatus('disconnected');
      },

      onWebSocketError: (error) => {
        console.error('[WS] Native WebSocket error', error);
        setWsStatus('disconnected');
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

  const editMessage = useCallback((conversationId: string, messageId: string, newContent: string) => {
    const client = stompClientRef.current;
    if (!client?.connected) return;
    client.publish({
      destination: '/app/chat.edit',
      body: JSON.stringify({ conversationId, messageId, newContent }),
    });
  }, []);

  const deleteMessage = useCallback((conversationId: string, messageId: string, forEveryone: boolean) => {
    const client = stompClientRef.current;
    if (!client?.connected) return;
    client.publish({
      destination: '/app/chat.delete',
      body: JSON.stringify({ conversationId, messageId, forEveryone }),
    });
  }, []);

  return { sendMessage, sendTyping, sendReadReceipt, editMessage, deleteMessage, wsStatus };
}
