import { ApiClient } from '../api-client';

export async function listCustomers(client: ApiClient, params?: Record<string, unknown>) {
  const res = await client.get('/customers', { limit: 100, ...params });
  if (res.status !== 200) {
    throw new Error(`List customers failed (${res.status})`);
  }
  // Paginated: { data: [...], pagination: {...} }
  return res.data;
}

export async function searchCustomers(client: ApiClient, search: string) {
  return listCustomers(client, { search });
}
