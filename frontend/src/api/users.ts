import api from './client';
import type { User } from '../types';

export const getMe = () =>
  api.get<User>('/users/me').then(r => r.data);

export const searchUsers = (q: string) =>
  api.get<User[]>(`/users/search?q=${encodeURIComponent(q)}`).then(r => r.data);

export const getUserProfile = (userId: string) =>
  api.get<User>(`/users/${userId}`).then(r => r.data);

export const updateProfile = (name: string, bio: string) =>
  api.put<User>('/users/me/profile', { name, bio }).then(r => r.data);

export const uploadAvatar = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<User>('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
