import api from './client';
import type { Session } from '../types';

export const getSessions = () =>
  api.get<Session[]>('/sessions').then(r => r.data);

export const renameSession = (id: string, label: string | null) =>
  api.put<Session>(`/sessions/${id}/label`, { label }).then(r => r.data);

export const revokeSession = (id: string) =>
  api.delete(`/sessions/${id}`);
