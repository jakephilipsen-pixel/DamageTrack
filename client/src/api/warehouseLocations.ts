import apiClient from './client';
import { WarehouseLocation, PaginatedResponse } from '../types';

export interface WarehouseLocationFilters {
  page?: number;
  limit?: number;
  search?: string;
  activeOnly?: boolean;
}

export async function getWarehouseLocations(
  filters: WarehouseLocationFilters = {}
): Promise<PaginatedResponse<WarehouseLocation>> {
  const { data } = await apiClient.get('/warehouse-locations', { params: filters });
  return data;
}

export async function createWarehouseLocation(
  payload: Omit<WarehouseLocation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WarehouseLocation> {
  const { data } = await apiClient.post('/warehouse-locations', payload);
  return data;
}

export async function updateWarehouseLocation(
  id: string,
  payload: Partial<Omit<WarehouseLocation, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<WarehouseLocation> {
  const { data } = await apiClient.put(`/warehouse-locations/${id}`, payload);
  return data;
}

export async function deleteWarehouseLocation(id: string): Promise<void> {
  await apiClient.delete(`/warehouse-locations/${id}`);
}

export async function importWarehouseLocations(
  file: File
): Promise<{ created: number; errors: { row: number; message: string }[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/warehouse-locations/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
