import apiClient from './client';
import { Customer, PaginatedResponse } from '../types';

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
