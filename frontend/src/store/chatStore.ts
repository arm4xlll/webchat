import { create } from 'zustand';
import type { Conversation, Message, PinnedMessage, User } from '../types';

interface TypingUser {
  userId: string;
  username: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, TypingUser[]>;
  lastReadAt: Record<string, Record<string, string>>;
  unreadCounts: Record<string, number>;
  pins: Record<string, PinnedMessage[]>;

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversationMember: (member: User) => void;
  updateConversationLastMessage: (convId: string, timestamp: string) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (convId: string, msgs: Message[]) => void;
  prependMessages: (convId: string, msgs: Message[]) => void;
  historyLoaded: Record<string, boolean>;
  markHistoryLoaded: (convId: string) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (msg: Message) => void;
  /** Apply a server message, reconciling an optimistic temp in place when the
   *  echoed clientId matches — so the bubble never gets removed and re-added. */
  applyServerMessage: (msg: Message) => void;
  failMessage: (convId: string, tempId: string) => void;
  removeMessage: (convId: string, msgId: string) => void;
  setTyping: (convId: string, userId: string, username: string, typing: boolean) => void;
  clearAllTyping: () => void;
  setLastReadAt: (convId: string, userId: string, lastReadAt: string) => void;
  markMessagesReadAt: (convId: string, readerUserId: string, readAt: string) => void;
  incrementUnread: (convId: string) => void;
  clearUnread: (convId: string) => void;
  presenceStatus: Record<string, { online: boolean; lastSeenAt?: string }>;
  setPresence: (userId: string, online: boolean, lastSeenAt?: string) => void;

  // Pins
  setPins: (convId: string, pins: PinnedMessage[]) => void;
  addPin: (pin: PinnedMessage) => void;
  removePin: (convId: string, pinId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  historyLoaded: {},
  typingUsers: {},
  lastReadAt: {},
  unreadCounts: {},
  presenceStatus: {},
  pins: {},

  setConversations: (convs) => set((state) => {
    const merged = { ...state.lastReadAt };
    const unreadCounts = { ...state.unreadCounts };
    const pins = { ...state.pins };
    convs.forEach(conv => {
      if (conv.lastReadAt) {
        merged[conv.id] = { ...(merged[conv.id] ?? {}), ...conv.lastReadAt };
      }
      if (conv.unreadCount !== undefined) {
        unreadCounts[conv.id] = conv.unreadCount;
      }
      if (conv.pins && conv.pins.length > 0) {
        pins[conv.id] = conv.pins;
      }
    });
    return { conversations: convs, lastReadAt: merged, unreadCounts, pins };
  }),

  addConversation: (conv) => set((state) => {
    const exists = state.conversations.some(c => c.id === conv.id);
    if (exists) return state;
    const merged = { ...state.lastReadAt };
    const pins = { ...state.pins };
    if (conv.lastReadAt) {
      merged[conv.id] = { ...(merged[conv.id] ?? {}), ...conv.lastReadAt };
    }
    if (conv.pins && conv.pins.length > 0) {
      pins[conv.id] = conv.pins;
    }
    return { conversations: [conv, ...state.conversations], lastReadAt: merged, pins };
  }),

  updateConversationMember: (member) => set((state) => ({
    conversations: state.conversations.map(conv => ({
      ...conv,
      members: conv.members.map(m => m.id === member.id ? { ...m, ...member } : m),
    })),
  })),

  updateConversationLastMessage: (convId, timestamp) => set((state) => ({
    conversations: state.conversations.map(c =>
      c.id === convId ? { ...c, lastMessageAt: timestamp } : c
    ),
  })),

  setActiveConversation: (id) => set((state) => ({
    activeConversationId: id,
    // Clear unread when opening a conversation
    unreadCounts: id ? { ...state.unreadCounts, [id]: 0 } : state.unreadCounts,
  })),

  setMessages: (convId, msgs) => set((state) => ({
    messages: { ...state.messages, [convId]: msgs },
  })),

  markHistoryLoaded: (convId) => set((state) => ({
    historyLoaded: { ...state.historyLoaded, [convId]: true },
  })),

  prependMessages: (convId, msgs) => set((state) => {
    const prev = state.messages[convId] ?? [];
    const existingIds = new Set(prev.map(m => m.id));
    const unique = msgs.filter(m => !existingIds.has(m.id));
    if (unique.length === 0) return state;
    return { messages: { ...state.messages, [convId]: [...unique, ...prev] } };
  }),

  addMessage: (msg) => set((state) => {
    const prev = state.messages[msg.conversationId] ?? [];
    const exists = prev.some(m => m.id === msg.id);
    if (exists) return state;
    return {
      messages: { ...state.messages, [msg.conversationId]: [...prev, msg] },
    };
  }),

  updateMessage: (msg) => set((state) => {
    const prev = state.messages[msg.conversationId] ?? [];
    return {
      messages: {
        ...state.messages,
        // Preserve the stable clientId so an edit/reaction/read update on a
        // just-sent message doesn't change its React key and remount it.
        [msg.conversationId]: prev.map(m => m.id === msg.id ? { ...msg, clientId: m.clientId ?? msg.clientId } : m),
      },
    };
  }),

  applyServerMessage: (msg) => set((state) => {
    const prev = state.messages[msg.conversationId] ?? [];
    // Already have the real message (other delivery path won the race) → no-op.
    if (prev.some(m => m.id === msg.id)) return state;
    // Echoed clientId matches our optimistic temp → reconcile in place. The
    // React key (clientId) stays the same, so the bubble is reused: the status
    // just flips pending → sent, no remove-and-recreate.
    if (msg.clientId) {
      const idx = prev.findIndex(m => (m.clientId ?? m.id) === msg.clientId);
      if (idx !== -1) {
        const merged = prev.slice();
        merged[idx] = { ...msg, clientId: msg.clientId };
        return { messages: { ...state.messages, [msg.conversationId]: merged } };
      }
    }
    // Brand-new message.
    return { messages: { ...state.messages, [msg.conversationId]: [...prev, msg] } };
  }),

  failMessage: (convId, tempId) => set((state) => {
    const prev = state.messages[convId] ?? [];
    return {
      messages: {
        ...state.messages,
        [convId]: prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m),
      },
    };
  }),

  removeMessage: (convId, msgId) => set((state) => {
    const prev = state.messages[convId] ?? [];
    return {
      messages: {
        ...state.messages,
        [convId]: prev.filter(m => m.id !== msgId),
      },
    };
  }),

  setTyping: (convId, userId, username, typing) => set((state) => {
    const current = state.typingUsers[convId] ?? [];
    const filtered = current.filter(u => u.userId !== userId);
    const updated = typing ? [...filtered, { userId, username }] : filtered;
    return { typingUsers: { ...state.typingUsers, [convId]: updated } };
  }),

  clearAllTyping: () => set({ typingUsers: {} }),

  setPresence: (userId, online, lastSeenAt) => set((state) => ({
    presenceStatus: {
      ...state.presenceStatus,
      [userId]: { online, lastSeenAt: online ? undefined : (lastSeenAt ?? state.presenceStatus[userId]?.lastSeenAt) },
    },
  })),

  setLastReadAt: (convId, userId, lastReadAt) => set((state) => ({
    lastReadAt: {
      ...state.lastReadAt,
      [convId]: { ...(state.lastReadAt[convId] ?? {}), [userId]: lastReadAt },
    },
  })),

  markMessagesReadAt: (convId, readerUserId, readAt) => set((state) => {
    const prev = state.messages[convId];
    if (!prev) return state;
    const readTime = new Date(readAt);
    const updated = prev.map(m => {
      if (m.senderId === readerUserId) return m;
      if (m.readAt) return m;
      if (new Date(m.createdAt) > readTime) return m;
      return { ...m, readAt };
    });
    return { messages: { ...state.messages, [convId]: updated } };
  }),

  incrementUnread: (convId) => set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      [convId]: (state.unreadCounts[convId] ?? 0) + 1,
    },
  })),

  clearUnread: (convId) => set((state) => ({
    unreadCounts: { ...state.unreadCounts, [convId]: 0 },
  })),

  // Pins
  setPins: (convId, pins) => set((state) => ({
    pins: { ...state.pins, [convId]: pins },
  })),

  addPin: (pin) => set((state) => {
    const prev = state.pins[pin.conversationId] ?? [];
    const exists = prev.some(p => p.id === pin.id);
    if (exists) return state;
    return { pins: { ...state.pins, [pin.conversationId]: [...prev, pin] } };
  }),

  removePin: (convId, pinId) => set((state) => {
    const prev = state.pins[convId] ?? [];
    return { pins: { ...state.pins, [convId]: prev.filter(p => p.id !== pinId) } };
  }),
}));
