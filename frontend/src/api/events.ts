import api from './client';
import type { Attachment, Message } from '../types';

export const sendMessage = (
  conversationId: string,
  content: string,
  attachment?: Attachment,
  replyToId?: string
): Promise<Message> =>
  api.post<Message>(`/conversations/${conversationId}/messages`, {
    content,
    ...(attachment ?? {}),
    replyToId,
  }).then(r => r.data);

export const sendTyping = (conversationId: string, typing: boolean): Promise<void> =>
  api.post(`/conversations/${conversationId}/typing`, { conversationId, typing }).then(() => undefined);

export const markRead = (conversationId: string): Promise<void> =>
  api.post(`/conversations/${conversationId}/read`).then(() => undefined);

export const toggleReaction = (messageId: string, emoji: string): Promise<void> =>
  api.post(`/messages/${messageId}/reactions`, { messageId, emoji }).then(() => undefined);

export const syncPresence = (): Promise<void> =>
  api.post('/presence/sync').then(() => undefined);
