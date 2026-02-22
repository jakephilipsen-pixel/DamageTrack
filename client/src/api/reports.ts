import apiClient from './client';
import { DashboardStats } from '../types';

export async function getDashboardStats(params?: { dateFrom?: string; dateTo?: string }): Promise<DashboardStats> {
  const { data } = await apiClient.get('/reports/dashboard-stats', { params });
  return data;
}

export async function getReportByCustomer(params?: { dateFrom?: string; dateTo?: string }) {
  const { data } = await apiClient.get('/reports/by-customer', { params });
  return data;
}

export async function getReportByCause(params?: { dateFrom?: string; dateTo?: string }) {
  const { data } = await apiClient.get('/reports/by-cause', { params });
  return data;
}

export async function getReportBySeverity(params?: { dateFrom?: string; dateTo?: string }) {
  const { data } = await apiClient.get('/reports/by-severity', { params });
  return data;
}

export async function getReportByStatus(params?: { dateFrom?: string; dateTo?: string }) {
  const { data } = await apiClient.get('/reports/by-status', { params });
  return data;
}

export async function getMonthlyTrend(months?: number) {
  const { data } = await apiClient.get('/reports/monthly-trend', { params: { months } });
  return data;
}

export async function exportCSV(params?: { dateFrom?: string; dateTo?: string; status?: string; customerId?: string }): Promise<void> {
  const response = await apiClient.get('/export/csv', { params, responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `damage-report-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
