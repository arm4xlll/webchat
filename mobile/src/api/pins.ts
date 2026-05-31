import { api } from './client';
import type { PinnedMessage } from '../types';

export const getPins = (convId: string) =>
  api.get<PinnedMessage[]>(`/conversations/${convId}/pins`);

export const addPin = (convId: string, messageId: number, pinnedForAll: boolean) =>
  api.post<PinnedMessage>(`/conversations/${convId}/pins`, { messageId, pinnedForAll });

export const removePin = (convId: string, pinId: number) =>
  api.delete<void>(`/conversations/${convId}/pins/${pinId}`);
