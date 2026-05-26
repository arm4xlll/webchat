import api from './client';
import type { AuthResponse } from '../types';

export const register = (name: string, username: string, password: string) =>
  api.post<AuthResponse>('/auth/register', { name, username, password }).then(r => r.data);

export const login = (username: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { username, password }).then(r => r.data);

export const logout = () =>
  api.post('/auth/logout');
