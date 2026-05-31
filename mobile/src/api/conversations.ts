import { api } from './client';
import type { Conversation, Message } from '../types';

export const getConversations = () =>
  api.get<Conversation[]>('/conversations');

export const createConversation = (targetUserId: number) =>
  api.post<Conversation>('/conversations', { targetUserId });

export const getMessages = (conversationId: string, page = 0) =>
  api.get<Message[]>(`/conversations/${conversationId}/messages?page=${page}&size=30`);

export const sendMessage = (conversationId: string, content: string, replyToId?: number) =>
  api.post<Message>(`/conversations/${conversationId}/messages`, { content, replyToId });

export const editMessage = (conversationId: string, messageId: number, newContent: string) =>
  api.patch<Message>(`/conversations/${conversationId}/messages/${messageId}`, { newContent });

export const deleteMessage = (conversationId: string, messageId: number, forEveryone = false) =>
  api.delete<void>(`/conversations/${conversationId}/messages/${messageId}?forEveryone=${forEveryone}`);

export const sendTyping = (conversationId: string, typing: boolean) =>
  api.post<void>(`/conversations/${conversationId}/typing`, { conversationId, typing });

export const markRead = (conversationId: string) =>
  api.post<void>(`/conversations/${conversationId}/read`);

export const toggleReaction = (messageId: number, emoji: string) =>
  api.post<void>(`/messages/${messageId}/reactions`, { messageId, emoji });
