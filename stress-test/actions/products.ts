import { ApiClient } from '../api-client';

export async function listProducts(client: ApiClient, params?: Record<string, unknown>) {
  const res = await client.get('/products', { limit: 100, ...params });
  if (res.status !== 200) {
    throw new Error(`List products failed (${res.status})`);
  }
  // Paginated: { data: [...], pagination: {...} }
  return res.data;
}

export async function searchProducts(client: ApiClient, search: string) {
  return listProducts(client, { search });
}
