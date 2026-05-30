import { useEffect, useCallback, useState, useRef } from 'react';
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

/** Run `tasks` with at most `limit` in-flight at a time. */
async function withConcurrency(tasks: (() => Promise<void>)[], limit: number): Promise<void> {
  let idx = 0;
  const run = async () => {
    while (idx < tasks.length) {
      const i = idx++;
      await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run));
}

export function useEventStream() {
  const accessToken = useAuthStore(s => s.accessToken);
  const [wsStatus, setWsStatus] = useState<StreamStatus>('connecting');
  const applyFromServer = useThemeStore(s => s.applyFromServer);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!accessToken) {
      setWsStatus('disconnected');
      return;
    }

    reconnectAttempts.current = 0;
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
              reconnectAttempts.current = 0;
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
            // Exponential backoff: 2s → 4s → 8s → 16s → 30s max, plus jitter
            const attempt = reconnectAttempts.current;
            reconnectAttempts.current = Math.min(attempt + 1, 5);
            return Math.min(2_000 * 2 ** attempt + Math.random() * 1_000, 30_000);
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
        const tasks = convs.map(c => async () => {
          const msgs = cachedMessages[c.id];
          if (!msgs || msgs.length === 0) return;
          try {
            const lastAt = msgs[msgs.length - 1].createdAt;
            const newMsgs = await getMessagesAfter(c.id, lastAt);
            newMsgs.forEach(m => useChatStore.getState().addMessage(m));
          } catch (e) {
            console.error('[SSE] catch-up failed', c.id, e);
          }
        });
        // Limit to 3 concurrent catch-up requests to avoid flooding on slow networks
        await withConcurrency(tasks, 3);
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
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Optimistic update: show message immediately while it travels over slow net
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const store = useChatStore.getState();

    let replyToContent: string | undefined;
    let replyToSenderName: string | undefined;
    if (replyToId) {
      const replyMsg = (store.messages[conversationId] ?? []).find(m => m.id === replyToId);
      replyToContent = replyMsg?.content;
      replyToSenderName = replyMsg?.senderName;
    }

    const tempMsg: Message = {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderUsername: user.username,
      senderName: user.name,
      content,
      createdAt: new Date().toISOString(),
      pending: true,
      ...(attachment ? {
        fileUrl: attachment.fileUrl,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
      } : {}),
      ...(replyToId ? { replyToId, replyToContent, replyToSenderName } : {}),
    };

    store.addMessage(tempMsg);
    store.updateConversationLastMessage(conversationId, tempMsg.createdAt);

    eventsApi.sendMessage(conversationId, content, attachment, replyToId)
      .then(msg => {
        useChatStore.getState().removeMessage(conversationId, tempId);
        useChatStore.getState().addMessage(msg);
      })
      .catch(e => {
        console.error('[Send] failed', e);
        useChatStore.getState().removeMessage(conversationId, tempId);
      });
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
