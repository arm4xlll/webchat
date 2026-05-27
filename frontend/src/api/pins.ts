import api from './client';
import type { PinnedMessage } from '../types';

export const getPins = (convId: string) =>
  api.get<PinnedMessage[]>(`/conversations/${convId}/pins`).then(r => r.data);

export const addPin = (convId: string, messageId: string, pinnedForAll: boolean) =>
  api.post<PinnedMessage>(`/conversations/${convId}/pins`, { messageId, pinnedForAll }).then(r => r.data);

export const removePin = (convId: string, pinId: string) =>
  api.delete(`/conversations/${convId}/pins/${pinId}`).then(() => undefined);
