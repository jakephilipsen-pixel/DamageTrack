import { useNavigate } from 'react-router-dom';
import { Calendar, User, MapPin } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { StatusBadge, SeverityBadge } from './StatusBadge';
import { DamageReport } from '../../types';
import { formatDate, CAUSE_LABELS } from '../../utils/formatters';

interface DamageCardProps {
  damage: DamageReport;
}

export function DamageCard({ damage }: DamageCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/damages/${damage.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{damage.referenceNumber}</p>
            <p className="font-semibold mt-0.5">{damage.customer?.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={damage.status} />
            <SeverityBadge severity={damage.severity} />
          </div>
        </div>

        <div className="space-y-1 mb-3">
          <p className="text-sm font-medium text-muted-foreground">
            {damage.product?.name}
            <span className="ml-1 text-xs">({damage.product?.sku})</span>
          </p>
          <p className="text-xs text-muted-foreground">{CAUSE_LABELS[damage.cause]}</p>
          <p className="text-sm line-clamp-2">{damage.description}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(damage.dateOfDamage)}
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {damage.reportedBy?.firstName} {damage.reportedBy?.lastName}
          </div>
          {damage.locationInWarehouse && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-20">{damage.locationInWarehouse}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
