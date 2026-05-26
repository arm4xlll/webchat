import { create } from 'zustand';
import type { Conversation, Message } from '../types';

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

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (convId: string, msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (msg: Message) => void;
  removeMessage: (convId: string, msgId: string) => void;
  setTyping: (convId: string, userId: string, username: string, typing: boolean) => void;
  clearAllTyping: () => void;
  setLastReadAt: (convId: string, userId: string, lastReadAt: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  lastReadAt: {},

  setConversations: (convs) => set({ conversations: convs }),

  addConversation: (conv) => set((state) => {
    const exists = state.conversations.some(c => c.id === conv.id);
    if (exists) return state;
    return { conversations: [conv, ...state.conversations] };
  }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (convId, msgs) => set((state) => ({
    messages: { ...state.messages, [convId]: msgs },
  })),

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

  setLastReadAt: (convId, userId, lastReadAt) => set((state) => ({
    lastReadAt: {
      ...state.lastReadAt,
      [convId]: { ...(state.lastReadAt[convId] ?? {}), [userId]: lastReadAt },
    },
  })),
}));
