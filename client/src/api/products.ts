import apiClient from './client';
import { Product, PaginatedResponse, ImportResult } from '../types';

export async function getProducts(params: { search?: string; customerId?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<Product>> {
  const { data } = await apiClient.get('/products', { params });
  return data;
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await apiClient.get(`/products/${id}`);
  return data;
}

export async function createProduct(payload: Partial<Product>): Promise<Product> {
  const { data } = await apiClient.post('/products', payload);
  return data;
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
  const { data } = await apiClient.put(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function importProductsCSV(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post('/import/products', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
