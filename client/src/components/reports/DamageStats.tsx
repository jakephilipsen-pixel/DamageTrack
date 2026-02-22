import { TrendingUp, AlertCircle, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { DashboardStats } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DamageStatsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

export function DamageStats({ stats, isLoading }: DamageStatsProps) {
  const openStatuses = ['DRAFT', 'REPORTED', 'UNDER_REVIEW', 'CUSTOMER_NOTIFIED', 'CLAIM_FILED'];
  const openCount = stats?.byStatus
    .filter((s) => openStatuses.includes(s.status))
    .reduce((sum, s) => sum + s.count, 0) ?? 0;

  const items = [
    {
      label: 'Today',
      value: stats?.totalToday ?? 0,
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'This Week',
      value: stats?.totalThisWeek ?? 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Open Reports',
      value: openCount,
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Open Loss Estimate',
      value: formatCurrency(stats?.totalOpenLoss),
      icon: DollarSign,
      color: 'text-red-600',
      bg: 'bg-red-50',
      isString: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold mt-1">
                  {item.isString ? item.value : item.value.toLocaleString()}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
