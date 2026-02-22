import apiClient, { setAccessToken } from './client';
import { User } from '../types';

export async function login(username: string, password: string): Promise<{ user: User; accessToken: string }> {
  const { data } = await apiClient.post('/auth/login', { username, password });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
  setAccessToken(null);
}

export async function refreshToken(): Promise<string> {
  const { data } = await apiClient.post('/auth/refresh');
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.put('/auth/change-password', { currentPassword, newPassword });
}
