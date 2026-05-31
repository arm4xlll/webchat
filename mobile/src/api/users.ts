import { api } from './client';
import type { User } from '../types';

export const getMe = () => api.get<User>('/users/me');

export const searchUsers = (q: string) =>
  api.get<User[]>(`/users/search?q=${encodeURIComponent(q)}`);

export const getUser = (userId: number) =>
  api.get<User>(`/users/${userId}`);

export const updateProfile = (name: string, bio: string) =>
  api.put<User>('/users/me/profile', { name, bio });
