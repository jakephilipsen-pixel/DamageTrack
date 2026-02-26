import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { StatusBadge } from '../damages/StatusBadge';
import { Skeleton } from '../ui/skeleton';
import { useDamages } from '../../hooks/useDamages';
import { formatDate, CAUSE_LABELS } from '../../utils/formatters';

interface CustomerDamageHistoryProps {
  customerId: string;
}

export function CustomerDamageHistory({ customerId }: CustomerDamageHistoryProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useDamages({ customerId, limit: 10, page: 1 });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!data?.data.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No damage reports for this customer.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Cause</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.data.map((damage) => (
          <TableRow
            key={damage.id}
            className="cursor-pointer"
            onClick={() => navigate(`/damages/${damage.id}`)}
          >
            <TableCell>
              <span className="font-mono text-xs font-semibold text-primary">{damage.referenceNumber}</span>
            </TableCell>
            <TableCell className="text-sm">{formatDate(damage.dateOfDamage)}</TableCell>
            <TableCell className="text-sm">{damage.product?.name}</TableCell>
            <TableCell className="text-sm">{CAUSE_LABELS[damage.cause]}</TableCell>
            <TableCell><StatusBadge status={damage.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
