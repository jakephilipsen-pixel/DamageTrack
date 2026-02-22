import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DamageChart } from '../components/reports/DamageChart';
import { DamageStats } from '../components/reports/DamageStats';
import { ExportButton } from '../components/reports/ExportButton';
import { Skeleton } from '../components/ui/skeleton';
import {
  getDashboardStats,
  getReportByCustomer,
  getReportByCause,
  getReportBySeverity,
  getReportByStatus,
  getMonthlyTrend,
} from '../api/reports';
import { useCustomers } from '../hooks/useCustomers';
import {
  CAUSE_LABELS,
  STATUS_LABELS,
  SEVERITY_LABELS,
} from '../utils/formatters';
import { DamageCause, DamageStatus, DamageSeverity } from '../types';

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [months, setMonths] = useState('6');
  const [exportCustomer, setExportCustomer] = useState('all');
  const [exportStatus, setExportStatus] = useState('all');

  const params = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', params],
    queryFn: () => getDashboardStats(params),
  });

  const { data: byCustomer, isLoading: byCustomerLoading } = useQuery({
    queryKey: ['report-by-customer', params],
    queryFn: () => getReportByCustomer(params),
  });

  const { data: byCause, isLoading: byCauseLoading } = useQuery({
    queryKey: ['report-by-cause', params],
    queryFn: () => getReportByCause(params),
  });

  const { data: bySeverity, isLoading: bySeverityLoading } = useQuery({
    queryKey: ['report-by-severity', params],
    queryFn: () => getReportBySeverity(params),
  });

  const { data: byStatus, isLoading: byStatusLoading } = useQuery({
    queryKey: ['report-by-status', params],
    queryFn: () => getReportByStatus(params),
  });

  const { data: monthlyTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['monthly-trend', months],
    queryFn: () => getMonthlyTrend(Number(months)),
  });

  const { data: customersData } = useCustomers({ limit: 200 });

  const mapByCustomer = Array.isArray(byCustomer)
    ? byCustomer.map((r: any) => ({ name: r.customerName || r.name, value: r.count || r.value }))
    : [];

  const mapByCause = Array.isArray(byCause)
    ? byCause.map((r: any) => ({ name: CAUSE_LABELS[r.cause as DamageCause] || r.cause, value: r.count || r.value }))
    : [];

  const mapBySeverity = Array.isArray(bySeverity)
    ? bySeverity.map((r: any) => ({ name: SEVERITY_LABELS[r.severity as DamageSeverity] || r.severity, value: r.count || r.value }))
    : [];

  const mapByStatus = Array.isArray(byStatus)
    ? byStatus.map((r: any) => ({ name: STATUS_LABELS[r.status as DamageStatus] || r.status, value: r.count || r.value }))
    : [];

  const mapMonthlyTrend = Array.isArray(monthlyTrend)
    ? monthlyTrend.map((r: any) => ({ name: r.month || r.period, value: r.count || r.value }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Analyze damage patterns and trends</p>
        </div>
        <ExportButton
          params={{
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            customerId: exportCustomer !== 'all' ? exportCustomer : undefined,
            status: exportStatus !== 'all' ? exportStatus : undefined,
          }}
        />
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Export: Customer</Label>
              <Select value={exportCustomer} onValueChange={setExportCustomer}>
                <SelectTrigger className="w-44 h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customersData?.data.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Export: Status</Label>
              <Select value={exportStatus} onValueChange={setExportStatus}>
                <SelectTrigger className="w-44 h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(Object.keys(STATUS_LABELS) as DamageStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <DamageStats stats={stats} isLoading={statsLoading} />

      {/* Charts */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customer">By Customer</TabsTrigger>
          <TabsTrigger value="cause">By Cause</TabsTrigger>
          <TabsTrigger value="severity">By Severity</TabsTrigger>
          <TabsTrigger value="status">By Status</TabsTrigger>
          <TabsTrigger value="trend">Monthly Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Reports by Status</CardTitle></CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-64 w-full" /> : (
                  <DamageChart
                    data={(stats?.byStatus || []).map((s) => ({ name: STATUS_LABELS[s.status], value: s.count }))}
                    type="pie"
                    height={280}
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Reports by Severity</CardTitle></CardHeader>
              <CardContent>
                {bySeverityLoading ? <Skeleton className="h-64 w-full" /> : (
                  <DamageChart data={mapBySeverity} type="bar" height={280} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customer" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Damage Reports by Customer</CardTitle></CardHeader>
            <CardContent>
              {byCustomerLoading ? <Skeleton className="h-80 w-full" /> : (
                <DamageChart data={mapByCustomer} type="bar" height={350} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cause" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Damage Reports by Cause</CardTitle></CardHeader>
            <CardContent>
              {byCauseLoading ? <Skeleton className="h-80 w-full" /> : (
                <DamageChart data={mapByCause} type="bar" height={350} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="severity" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Damage Reports by Severity</CardTitle></CardHeader>
            <CardContent>
              {bySeverityLoading ? <Skeleton className="h-80 w-full" /> : (
                <DamageChart data={mapBySeverity} type="pie" height={350} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Damage Reports by Status</CardTitle></CardHeader>
            <CardContent>
              {byStatusLoading ? <Skeleton className="h-80 w-full" /> : (
                <DamageChart data={mapByStatus} type="bar" height={350} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Monthly Damage Trend</CardTitle>
                <Select value={months} onValueChange={setMonths}>
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Last 3 months</SelectItem>
                    <SelectItem value="6">Last 6 months</SelectItem>
                    <SelectItem value="12">Last 12 months</SelectItem>
                    <SelectItem value="24">Last 24 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {trendLoading ? <Skeleton className="h-80 w-full" /> : (
                <DamageChart data={mapMonthlyTrend} type="line" height={350} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
