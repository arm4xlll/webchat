import { useEffect, useCallback, useState, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore, type FontSize } from '../store/themeStore';
import { useCallStore } from '../store/callStore';
import { getConversations, getMessagesAfter } from '../api/conversations';
import * as eventsApi from '../api/events';
import { isNewVersionAvailable } from '../utils/versionCheck';
import type {
  Attachment, Conversation, Message, PinnedMessage, PresenceEvent,
  ReadReceiptEvent, TypingEvent, User,
} from '../types';
import type { CallAnsweredEvent, CallEndedEvent, CallIncomingEvent } from '../types/call';

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

/** Heartbeats arrive every 15s; if we see no traffic for this long, the
 *  connection is assumed dead even if the browser hasn't noticed yet. */
const STALE_MS = 40_000;
/** Background safety-net poll interval for reconciling missed messages. */
const RECONCILE_INTERVAL_MS = 20_000;

export function useEventStream() {
  const accessToken = useAuthStore(s => s.accessToken);
  const [wsStatus, setWsStatus] = useState<StreamStatus>('connecting');
  const applyFromServer = useThemeStore(s => s.applyFromServer);
  const reconnectAttempts = useRef(0);
  // Timestamp of the last byte received over SSE (events + heartbeats).
  const lastActivityRef = useRef(Date.now());
  // Bumping this tears down and re-establishes the SSE connection.
  const [reconnectNonce, setReconnectNonce] = useState(0);

  /**
   * Pull any messages the SSE stream may have missed (dropped events, sleep,
   * silent connection death) for every conversation we already have loaded.
   * Idempotent — relies on store-level dedup by message id.
   */
  const catchUpMessages = useCallback(async () => {
    const { conversations, messages, activeConversationId } = useChatStore.getState();
    const currentUserId = useAuthStore.getState().user?.id;
    const tasks = conversations
      .filter(c => (messages[c.id]?.length ?? 0) > 0)
      .map(c => async () => {
        const list = useChatStore.getState().messages[c.id] ?? [];
        // Cursor = newest *confirmed* message, so an optimistic temp message's
        // client clock can't make us skip rows the server actually has.
        let cursor: string | undefined;
        for (let i = list.length - 1; i >= 0; i--) {
          if (!list[i].pending) { cursor = list[i].createdAt; break; }
        }
        if (!cursor) return;
        try {
          const fresh = await getMessagesAfter(c.id, cursor);
          for (const m of fresh) {
            const existed = (useChatStore.getState().messages[c.id] ?? []).some(x => x.id === m.id);
            if (existed) continue;
            useChatStore.getState().addMessage(m);
            useChatStore.getState().updateConversationLastMessage(c.id, m.createdAt);
            if (m.senderId !== currentUserId && activeConversationId !== c.id) {
              useChatStore.getState().incrementUnread(c.id);
            }
          }
        } catch (e) {
          console.error('[Sync] catch-up failed', c.id, e);
        }
      });
    await withConcurrency(tasks, 3);
  }, []);

  /** Full reconciliation: refresh conversation list (authoritative unread /
   *  last-message state) then catch up messages for each. */
  const reconcile = useCallback(async () => {
    try {
      const convs = await getConversations();
      useChatStore.getState().setConversations(convs);
    } catch (e) {
      console.error('[Sync] conversations refresh failed', e);
    }
    await catchUpMessages();
  }, [catchUpMessages]);

  useEffect(() => {
    if (!accessToken) {
      setWsStatus('disconnected');
      return;
    }

    reconnectAttempts.current = 0;
    lastActivityRef.current = Date.now();
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
              lastActivityRef.current = Date.now();
              setWsStatus('connected');
              return;
            }
            if (res.status === 401 || res.status === 403) {
              throw new FatalError(`SSE auth failed: ${res.status}`);
            }
            throw new Error(`SSE open failed: ${res.status}`);
          },
          onmessage(ev) {
            // Any traffic (including the `hb` heartbeat) proves the link is alive.
            lastActivityRef.current = Date.now();
            if (ev.event === 'hb' || !ev.event || !ev.data) return;
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
          reconcile();
          isNewVersionAvailable().then(newer => {
            if (newer) window.dispatchEvent(new CustomEvent('app:update-available'));
          });
          break;
        case 'message.created': {
          const msg = data as Message;
          const existed = (store.messages[msg.conversationId] ?? []).some(m => m.id === msg.id);
          // Reconciles our own optimistic temp in place (by clientId) or appends.
          store.applyServerMessage(msg);
          store.updateConversationLastMessage(msg.conversationId, msg.createdAt);
          const currentUserId = useAuthStore.getState().user?.id;
          if (!existed && msg.senderId !== currentUserId
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
        case 'call.incoming': {
          const ev = data as CallIncomingEvent;
          const callStore = useCallStore.getState();
          if (callStore.status === 'idle') {
            callStore.setIncoming(ev);
          }
          break;
        }
        case 'call.answered': {
          const ev = data as CallAnsweredEvent;
          const callStore = useCallStore.getState();
          if (callStore.status === 'calling') {
            if (ev.accepted && callStore.token && callStore.wsUrl) {
              callStore.activate(callStore.token, callStore.wsUrl);
            } else {
              callStore.endCall();
            }
          }
          break;
        }
        case 'call.ended': {
          const ev = data as CallEndedEvent;
          const callStore = useCallStore.getState();
          if (callStore.conversationId === ev.conversationId && callStore.status !== 'idle') {
            callStore.endCall();
          }
          break;
        }
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

    run();

    return () => {
      ctrl.abort();
      setWsStatus('disconnected');
    };
  }, [accessToken, applyFromServer, reconnectNonce, reconcile]);

  // ── Liveness watchdog ──────────────────────────────────────────────────────
  // fetchEventSource won't notice a silently-dead connection (OS sleep, network
  // change, buffering proxy). If no traffic arrives within STALE_MS, force a
  // reconnect, which re-fires stream.ready → reconcile() and re-syncs presence.
  useEffect(() => {
    if (!accessToken) return;
    const id = setInterval(() => {
      if (Date.now() - lastActivityRef.current > STALE_MS) {
        lastActivityRef.current = Date.now(); // avoid hammering before reconnect
        setReconnectNonce(n => n + 1);
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [accessToken]);

  // ── Reconciliation triggers ────────────────────────────────────────────────
  // Catch up whenever the tab regains attention or the network returns, plus a
  // slow background poll, so a dropped SSE event can never strand a message.
  useEffect(() => {
    if (!accessToken) return;
    const onVisible = () => { if (document.visibilityState === 'visible') reconcile(); };
    const onFocus = () => { reconcile(); };
    const onOnline = () => { setReconnectNonce(n => n + 1); reconcile(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    const poll = setInterval(() => { catchUpMessages(); }, RECONCILE_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      clearInterval(poll);
    };
  }, [accessToken, reconcile, catchUpMessages]);

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
      clientId: tempId,
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

    eventsApi.sendMessage(conversationId, content, attachment, replyToId, tempId)
      .then(msg => {
        // Reconcile in place by clientId (keeps the node, flips pending → sent).
        // Idempotent with the SSE echo: whichever arrives first wins, the other no-ops.
        useChatStore.getState().applyServerMessage(msg);
        useChatStore.getState().updateConversationLastMessage(conversationId, msg.createdAt);
      })
      .catch(e => {
        console.error('[Send] failed', e);
        // Keep the bubble but mark it failed instead of yanking it out of view.
        useChatStore.getState().failMessage(conversationId, tempId);
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
