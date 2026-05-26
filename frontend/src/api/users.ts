import api from './client';
import type { User } from '../types';

export const getMe = () =>
  api.get<User>('/users/me').then(r => r.data);

export const searchUsers = (q: string) =>
  api.get<User[]>(`/users/search?q=${encodeURIComponent(q)}`).then(r => r.data);
