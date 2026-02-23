import apiClient from './client';
import { Customer, PaginatedResponse, ImportResult } from '../types';

export async function getCustomers(params: { search?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<Customer>> {
  const { data } = await apiClient.get('/customers', { params });
  return data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data } = await apiClient.get(`/customers/${id}`);
  return data;
}

export async function createCustomer(payload: Partial<Customer>): Promise<Customer> {
  const { data } = await apiClient.post('/customers', payload);
  return data;
}

export async function updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
  const { data } = await apiClient.put(`/customers/${id}`, payload);
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}

export async function importCustomersCSV(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post('/import/customers', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
