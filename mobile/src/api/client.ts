import { API_BASE } from '../constants';
import { useAuthStore } from '../store/authStore';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 401 || res.status === 403) {
    useAuthStore.getState().logout();
    throw new ApiError('Сессия истекла', res.status);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.detail ?? 'Ошибка сервера', res.status);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: object) => request<T>('POST', path, body),
  put: <T>(path: string, body?: object) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: object) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
