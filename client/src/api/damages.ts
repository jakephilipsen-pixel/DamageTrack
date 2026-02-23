import apiClient from './client';
import { DamageReport, DamageComment, PaginatedResponse, DamageStatus } from '../types';

export interface DamageFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  severity?: string;
  cause?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  reportedById?: string;
}

export async function getDamages(filters: DamageFilters = {}): Promise<PaginatedResponse<DamageReport>> {
  const { data } = await apiClient.get('/damages', { params: filters });
  return data;
}

export async function getDamage(id: string): Promise<DamageReport> {
  const { data } = await apiClient.get(`/damages/${id}`);
  return data;
}

export async function createDamage(payload: Partial<DamageReport>): Promise<DamageReport> {
  const { data } = await apiClient.post('/damages', payload);
  return data;
}

export async function updateDamage(id: string, payload: Partial<DamageReport>): Promise<DamageReport> {
  const { data } = await apiClient.put(`/damages/${id}`, payload);
  return data;
}

export async function deleteDamage(id: string): Promise<void> {
  await apiClient.delete(`/damages/${id}`);
}

export async function changeStatus(id: string, status: DamageStatus, note?: string): Promise<DamageReport> {
  const { data } = await apiClient.patch(`/damages/${id}/status`, { status, note });
  return data;
}

export async function getComments(damageId: string): Promise<DamageComment[]> {
  const { data } = await apiClient.get(`/damages/${damageId}/comments`);
  return data;
}

export async function addComment(damageId: string, content: string): Promise<DamageComment> {
  const { data } = await apiClient.post(`/damages/${damageId}/comments`, { content });
  return data;
}

export async function uploadPhotos(damageId: string, files: File[]): Promise<any> {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));
  const { data } = await apiClient.post(`/photos/upload/${damageId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deletePhoto(photoId: string): Promise<void> {
  await apiClient.delete(`/photos/${photoId}`);
}

export async function setPrimaryPhoto(photoId: string): Promise<void> {
  await apiClient.patch(`/photos/${photoId}/primary`);
}

export async function updatePhotoCaption(photoId: string, caption: string): Promise<void> {
  await apiClient.patch(`/photos/${photoId}/caption`, { caption });
}

export async function bulkStatusChange(payload: {
  ids: string[];
  status: DamageStatus;
  note?: string;
}): Promise<{ updated: number; skipped: { id: string; reason: string }[] }> {
  const { data } = await apiClient.patch('/damages/bulk-status', payload);
  return data;
}

export async function sendEmailReport(damageId: string, payload: {
  to: string; subject: string; body: string; includePhotos: boolean;
}): Promise<void> {
  await apiClient.post(`/export/email/${damageId}`, payload);
}

export async function downloadPDF(damageId: string): Promise<void> {
  const response = await apiClient.get(`/export/pdf/${damageId}`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `damage-report-${damageId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
