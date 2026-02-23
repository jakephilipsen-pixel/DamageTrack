import apiClient from './client';

export interface Notification {
  id: string;
  damageId: string;
  referenceNumber: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUser: string | null;
  createdAt: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get('/notifications');
  return data;
}
