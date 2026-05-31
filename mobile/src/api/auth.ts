import { API_BASE } from '../constants';
import type { AuthResponse } from '../types';

async function request<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data?.detail ?? 'Ошибка сервера', res.status);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export const login = (username: string, password: string) =>
  request<AuthResponse>('/auth/login', { username, password });

export const register = (name: string, username: string, password: string) =>
  request<AuthResponse>('/auth/register', { name, username, password });
