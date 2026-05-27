import { create } from 'zustand';
import type { Conversation, Message, User } from '../types';

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

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversationMember: (member: User) => void;
  updateConversationLastMessage: (convId: string, timestamp: string) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (convId: string, msgs: Message[]) => void;
  prependMessages: (convId: string, msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (msg: Message) => void;
  removeMessage: (convId: string, msgId: string) => void;
  setTyping: (convId: string, userId: string, username: string, typing: boolean) => void;
  clearAllTyping: () => void;
  setLastReadAt: (convId: string, userId: string, lastReadAt: string) => void;
  markMessagesReadAt: (convId: string, readerUserId: string, readAt: string) => void;
  incrementUnread: (convId: string) => void;
  clearUnread: (convId: string) => void;
  presenceStatus: Record<string, { online: boolean; lastSeenAt?: string }>;
  setPresence: (userId: string, online: boolean, lastSeenAt?: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  lastReadAt: {},
  unreadCounts: {},
  presenceStatus: {},

  setConversations: (convs) => set((state) => {
    const merged = { ...state.lastReadAt };
    const unreadCounts = { ...state.unreadCounts };
    convs.forEach(conv => {
      if (conv.lastReadAt) {
        merged[conv.id] = { ...(merged[conv.id] ?? {}), ...conv.lastReadAt };
      }
      if (conv.unreadCount !== undefined) {
        unreadCounts[conv.id] = conv.unreadCount;
      }
    });
    return { conversations: convs, lastReadAt: merged, unreadCounts };
  }),

  addConversation: (conv) => set((state) => {
    const exists = state.conversations.some(c => c.id === conv.id);
    if (exists) return state;
    const merged = { ...state.lastReadAt };
    if (conv.lastReadAt) {
      merged[conv.id] = { ...(merged[conv.id] ?? {}), ...conv.lastReadAt };
    }
    return { conversations: [conv, ...state.conversations], lastReadAt: merged };
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
        [msg.conversationId]: prev.map(m => m.id === msg.id ? msg : m),
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
}));
