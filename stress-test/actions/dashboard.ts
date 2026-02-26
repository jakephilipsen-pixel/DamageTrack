import { ApiClient } from '../api-client';

export async function getDashboardStats(client: ApiClient) {
  const res = await client.get('/reports/dashboard-stats');
  if (res.status !== 200) {
    throw new Error(`Dashboard stats failed (${res.status})`);
  }
  return res.data?.data ?? res.data;
}

export async function getMonthlyTrend(client: ApiClient) {
  const res = await client.get('/reports/monthly-trend');
  if (res.status !== 200) {
    throw new Error(`Monthly trend failed (${res.status})`);
  }
  return res.data?.data ?? res.data;
}
