import { ApiClient } from '../api-client';

export async function listLocations(client: ApiClient, params?: Record<string, unknown>) {
  const res = await client.get('/warehouse-locations', { limit: 100, ...params });
  if (res.status !== 200) {
    throw new Error(`List locations failed (${res.status})`);
  }
  // Paginated: { data: [...], pagination: {...} }
  return res.data;
}

export async function searchLocations(client: ApiClient, search: string) {
  return listLocations(client, { search });
}
