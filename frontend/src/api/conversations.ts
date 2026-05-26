import api from './client';
import type { Conversation, Message } from '../types';

export const getConversations = () =>
  api.get<Conversation[]>('/conversations').then(r => r.data);

export const createConversation = (targetUserId: string) =>
  api.post<Conversation>('/conversations', { targetUserId }).then(r => r.data);

export const getMessages = (conversationId: string, page = 0, size = 50) =>
  api.get<Message[]>(`/conversations/${conversationId}/messages?page=${page}&size=${size}`).then(r => r.data);

export const getMessagesAfter = (conversationId: string, after: string) =>
  api.get<Message[]>(`/conversations/${conversationId}/messages/after?after=${encodeURIComponent(after)}`).then(r => r.data);
