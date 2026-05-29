import api from './client';
import type { AdminMetricsSnapshot, ErrorEntry, AdminUser } from '../types/admin';

export const getMetricsHistory = (rangeSeconds = 3600) =>
  api.get<AdminMetricsSnapshot[]>('/admin/metrics/history', { params: { rangeSeconds } }).then(r => r.data);

export const getErrorLog = (limit = 50) =>
  api.get<ErrorEntry[]>('/admin/metrics/errors', { params: { limit } }).then(r => r.data);

export const listAdmins = () =>
  api.get<AdminUser[]>('/admin/users/admins').then(r => r.data);

export const searchUsers = (q: string) =>
  api.get<AdminUser[]>('/admin/users/search', { params: { q } }).then(r => r.data);

export const grantAdmin = (id: string) =>
  api.post<AdminUser>(`/admin/users/${id}/grant`).then(r => r.data);

export const revokeAdmin = (id: string) =>
  api.post<AdminUser>(`/admin/users/${id}/revoke`).then(r => r.data);
