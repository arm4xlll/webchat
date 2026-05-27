import { useEffect, useCallback, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore, type FontSize } from '../store/themeStore';
import { getConversations, getMessagesAfter } from '../api/conversations';
import * as eventsApi from '../api/events';
import { isNewVersionAvailable } from '../utils/versionCheck';
import type {
  Attachment, Conversation, Message, PinnedMessage, PresenceEvent,
  ReadReceiptEvent, TypingEvent, User,
} from '../types';

type StreamStatus = 'connecting' | 'connected' | 'disconnected';

class FatalError extends Error {}

export function useEventStream() {
  const accessToken = useAuthStore(s => s.accessToken);
  const [wsStatus, setWsStatus] = useState<StreamStatus>('connecting');
  const applyFromServer = useThemeStore(s => s.applyFromServer);

  useEffect(() => {
    if (!accessToken) {
      setWsStatus('disconnected');
      return;
    }

    const ctrl = new AbortController();
    setWsStatus('connecting');

    const run = async () => {
      try {
        await fetchEventSource('/api/events/stream', {
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${accessToken}` },
          openWhenHidden: true,
          async onopen(res) {
            if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
              setWsStatus('connected');
              return;
            }
            if (res.status === 401 || res.status === 403) {
              throw new FatalError(`SSE auth failed: ${res.status}`);
            }
            throw new Error(`SSE open failed: ${res.status}`);
          },
          onmessage(ev) {
            if (!ev.event || !ev.data) return;
            try {
              dispatch(ev.event, JSON.parse(ev.data));
            } catch (e) {
              console.error('[SSE] dispatch failed', ev.event, e);
            }
          },
          onclose() {
            setWsStatus('connecting');
            throw new Error('SSE closed');
          },
          onerror(err) {
            if (err instanceof FatalError) throw err;
            setWsStatus('connecting');
            return 3000;
          },
        });
      } catch (e) {
        if (e instanceof FatalError) {
          console.error('[SSE] fatal — auth failed', e);
          useAuthStore.getState().logout();
        }
      }
    };

    const dispatch = (type: string, data: unknown) => {
      const store = useChatStore.getState();
      switch (type) {
        case 'stream.ready':
          onStreamReady();
          // SSE reconnect = backend restarted = likely a new deploy.
          // Check version.json; if newer → the update banner will appear.
          isNewVersionAvailable().then(newer => {
            if (newer) window.dispatchEvent(new CustomEvent('app:update-available'));
          });
          break;
        case 'message.created': {
          const msg = data as Message;
          store.addMessage(msg);
          store.updateConversationLastMessage(msg.conversationId, msg.createdAt);
          const currentUserId = useAuthStore.getState().user?.id;
          if (msg.senderId !== currentUserId
              && store.activeConversationId !== msg.conversationId) {
            store.incrementUnread(msg.conversationId);
          }
          break;
        }
        case 'message.updated':
        case 'message.deleted':
        case 'message.reaction':
          store.updateMessage(data as Message);
          break;
        case 'conversation.typing': {
          const ev = data as TypingEvent;
          store.setTyping(ev.conversationId, ev.userId, ev.username, ev.typing);
          break;
        }
        case 'conversation.read': {
          const ev = data as ReadReceiptEvent;
          store.setLastReadAt(ev.conversationId, ev.readerUserId, ev.lastReadAt);
          store.markMessagesReadAt(ev.conversationId, ev.readerUserId, ev.lastReadAt);
          break;
        }
        case 'presence.update': {
          const ev = data as PresenceEvent;
          store.setPresence(ev.userId, ev.online, ev.lastSeenAt);
          break;
        }
        case 'presence.snapshot': {
          const events = data as PresenceEvent[];
          events.forEach(ev => store.setPresence(ev.userId, ev.online, ev.lastSeenAt));
          break;
        }
        case 'conversation.created':
          store.addConversation(data as Conversation);
          break;
        case 'conversation.pin_added':
          store.addPin(data as PinnedMessage);
          break;
        case 'conversation.pin_removed': {
          const ev = data as { pinId: string; conversationId: string };
          store.removePin(ev.conversationId, ev.pinId);
          break;
        }
        case 'conversation.member_updated':
          store.updateConversationMember(data as User);
          break;
        case 'user.settings_updated': {
          const u = data as User;
          if (u.settings) {
            try {
              const s = JSON.parse(u.settings);
              if (s.themeId && s.fontSize) applyFromServer(s.themeId, s.fontSize as FontSize);
            } catch { /* ignore */ }
          }
          break;
        }
      }
    };

    const onStreamReady = async () => {
      try {
        const convs = await getConversations();
        useChatStore.getState().setConversations(convs);

        const cachedMessages = useChatStore.getState().messages;
        await Promise.all(convs.map(async c => {
          const msgs = cachedMessages[c.id];
          if (!msgs || msgs.length === 0) return;
          try {
            const lastAt = msgs[msgs.length - 1].createdAt;
            const newMsgs = await getMessagesAfter(c.id, lastAt);
            newMsgs.forEach(m => useChatStore.getState().addMessage(m));
          } catch (e) {
            console.error('[SSE] catch-up failed', c.id, e);
          }
        }));
      } catch (e) {
        console.error('[SSE] post-ready bootstrap failed', e);
      }
    };

    run();

    return () => {
      ctrl.abort();
      setWsStatus('disconnected');
    };
  }, [accessToken, applyFromServer]);

  const sendMessage = useCallback((
    conversationId: string,
    content: string,
    attachment?: Attachment,
    replyToId?: string,
  ) => {
    eventsApi.sendMessage(conversationId, content, attachment, replyToId)
      .then(msg => useChatStore.getState().addMessage(msg))
      .catch(e => console.error('[Send] failed', e));
  }, []);

  const sendTyping = useCallback((conversationId: string, typing: boolean) => {
    eventsApi.sendTyping(conversationId, typing).catch(e => console.error('[Typing] failed', e));
  }, []);

  const sendReadReceipt = useCallback((conversationId: string) => {
    eventsApi.markRead(conversationId).catch(e => console.error('[Read] failed', e));
  }, []);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    eventsApi.toggleReaction(messageId, emoji).catch(e => console.error('[React] failed', e));
  }, []);

  return { sendMessage, sendTyping, sendReadReceipt, sendReaction, wsStatus };
}
