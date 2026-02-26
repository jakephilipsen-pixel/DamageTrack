import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, AlertTriangle } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DamageStats } from '../components/reports/DamageStats';
import { DamageChart } from '../components/reports/DamageChart';
import { StatusBadge } from '../components/damages/StatusBadge';
import { Skeleton } from '../components/ui/skeleton';
import { getDashboardStats } from '../api/reports';
import { CAUSE_LABELS, STATUS_LABELS, formatDate } from '../utils/formatters';
import { DamageCause, DamageStatus } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { branding } = useBranding();

  useEffect(() => {
    document.title = `${branding.companyName} — Dashboard`;
  }, [branding.companyName]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => getDashboardStats(),
    refetchInterval: 60000,
  });

  const statusChartData = stats?.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status as DamageStatus] || s.status,
    value: s.count,
  })) || [];

  const causeChartData = stats?.byCause
    .slice(0, 8)
    .map((s) => ({
      name: CAUSE_LABELS[s.cause as DamageCause] || s.cause,
      value: s.count,
    })) || [];

  const customerChartData = stats?.byCustomer
    .slice(0, 10)
    .map((s) => ({
      name: s.customerName,
      value: s.count,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">Real-time damage report summary</p>
        </div>
        <Button onClick={() => navigate('/damages/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* Stats */}
      <DamageStats stats={stats} isLoading={isLoading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <DamageChart data={statusChartData} type="pie" height={280} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports by Cause</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <DamageChart data={causeChartData} type="bar" height={280} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Breakdown */}
      {customerChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports by Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <DamageChart data={customerChartData} type="bar" height={250} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Damages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Recent Damage Reports
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/damages')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : stats?.recentDamages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No damage reports yet. Create your first report!
            </p>
          ) : (
            <div className="space-y-0 divide-y">
              {stats?.recentDamages.map((damage) => (
                <div
                  key={damage.id}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 px-2 rounded -mx-2 transition-colors"
                  onClick={() => navigate(`/damages/${damage.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {damage.referenceNumber}
                        </span>
                        <StatusBadge status={damage.status} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {damage.customer?.name} — {damage.product?.name} ({damage.quantity} units)
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{formatDate(damage.dateOfDamage)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
