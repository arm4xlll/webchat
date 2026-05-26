import api from './client';
import type { Attachment, Conversation, Message } from '../types';

export const getConversations = () =>
  api.get<Conversation[]>('/conversations').then(r => r.data);

export const createConversation = (targetUserId: string) =>
  api.post<Conversation>('/conversations', { targetUserId }).then(r => r.data);

export const getMessages = (conversationId: string, page = 0, size = 50) =>
  api.get<Message[]>(`/conversations/${conversationId}/messages?page=${page}&size=${size}`).then(r => r.data);

export const getMessagesAfter = (conversationId: string, after: string) =>
  api.get<Message[]>(`/conversations/${conversationId}/messages/after?after=${encodeURIComponent(after)}`).then(r => r.data);

export const uploadFile = (file: File): Promise<Attachment> => {
  const form = new FormData();
  form.append('file', file);
  return api.post<Attachment>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const editMessage = (conversationId: string, messageId: string, content: string): Promise<Message> =>
  api.patch<Message>(`/conversations/${conversationId}/messages/${messageId}`, { content }).then(r => r.data);

export const deleteMessage = (conversationId: string, messageId: string, forEveryone: boolean): Promise<void> =>
  api.delete(`/conversations/${conversationId}/messages/${messageId}?forEveryone=${forEveryone}`).then(() => undefined);
