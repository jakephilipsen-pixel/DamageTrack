import apiClient from './client';
import { User, AuditLog } from '../types';

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get('/users');
  return data;
}

export async function createUser(payload: { email: string; username: string; firstName: string; lastName: string; role: string; password: string }): Promise<User> {
  const { data } = await apiClient.post('/users', payload);
  return data;
}

export async function updateUser(id: string, payload: Partial<User>): Promise<User> {
  const { data } = await apiClient.put(`/users/${id}`, payload);
  return data;
}

export async function toggleUserActive(id: string): Promise<User> {
  const { data } = await apiClient.patch(`/users/${id}/toggle-active`);
  return data;
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await apiClient.post(`/users/${id}/reset-password`, { newPassword });
}

export async function getAuditLogs(params?: { userId?: string; action?: string; entity?: string; dateFrom?: string; dateTo?: string; page?: number }): Promise<{ data: AuditLog[]; pagination: any }> {
  const { data } = await apiClient.get('/admin/audit-logs', { params });
  return data;
}

export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await apiClient.get('/admin/settings');
  return data;
}

export async function updateSettings(settings: Record<string, string>): Promise<void> {
  await apiClient.put('/admin/settings', settings);
}
