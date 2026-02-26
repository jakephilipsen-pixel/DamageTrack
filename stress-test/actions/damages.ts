import { ApiClient } from '../api-client';
import { DamageStatus } from '../types';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['CUSTOMER_NOTIFIED'],
  CUSTOMER_NOTIFIED: ['DESTROY_STOCK', 'REP_COLLECT'],
  DESTROY_STOCK: ['CLOSED'],
  REP_COLLECT: ['CLOSED'],
  CLOSED: [],
};

export async function createDamageReport(client: ApiClient, payload: Record<string, unknown>) {
  const res = await client.post('/damages', payload);
  if (res.status !== 201) {
    throw new Error(`Create damage failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data?.data ?? res.data;
}

export async function listDamages(client: ApiClient, params?: Record<string, unknown>) {
  const res = await client.get('/damages', params);
  if (res.status !== 200) {
    throw new Error(`List damages failed (${res.status})`);
  }
  // Paginated response: { data: [...], pagination: {...} }
  return res.data;
}

export async function getDamageDetail(client: ApiClient, id: string) {
  const res = await client.get(`/damages/${id}`);
  if (res.status !== 200) {
    throw new Error(`Get damage detail failed (${res.status})`);
  }
  return res.data?.data ?? res.data;
}

export async function transitionStatus(
  client: ApiClient,
  id: string,
  currentStatus: DamageStatus,
  note?: string
) {
  const nextOptions = STATUS_TRANSITIONS[currentStatus];
  if (!nextOptions || nextOptions.length === 0) return null;

  const nextStatus = nextOptions[Math.floor(Math.random() * nextOptions.length)];
  const res = await client.patch(`/damages/${id}/status`, { status: nextStatus, note });
  if (res.status !== 200) {
    throw new Error(`Status transition failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data?.data ?? res.data;
}

export async function addComment(client: ApiClient, damageId: string, content: string) {
  const res = await client.post(`/damages/${damageId}/comments`, { content });
  if (res.status !== 201) {
    throw new Error(`Add comment failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data?.data ?? res.data;
}
