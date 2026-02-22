import { useNavigate } from 'react-router-dom';
import { Eye, MoreHorizontal } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../ui/table';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { StatusBadge, SeverityBadge } from './StatusBadge';
import { Skeleton } from '../ui/skeleton';
import { DamageReport, DamageStatus } from '../../types';
import { formatDate, CAUSE_LABELS, STATUS_LABELS } from '../../utils/formatters';
import { useChangeStatus } from '../../hooks/useDamages';

const STATUS_TRANSITIONS: Record<DamageStatus, DamageStatus[]> = {
  DRAFT: ['REPORTED'],
  REPORTED: ['UNDER_REVIEW', 'DRAFT'],
  UNDER_REVIEW: ['CUSTOMER_NOTIFIED', 'CLAIM_FILED', 'RESOLVED'],
  CUSTOMER_NOTIFIED: ['CLAIM_FILED', 'RESOLVED', 'WRITTEN_OFF'],
  CLAIM_FILED: ['RESOLVED', 'WRITTEN_OFF'],
  RESOLVED: ['CLOSED'],
  WRITTEN_OFF: ['CLOSED'],
  CLOSED: [],
};

interface DamageTableProps {
  damages: DamageReport[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
}

export function DamageTable({ damages, isLoading, pagination, onPageChange }: DamageTableProps) {
  const navigate = useNavigate();
  const changeStatus = useChangeStatus();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (damages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No damage reports found</p>
        <p className="text-sm mt-1">Try adjusting your filters or create a new report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Cause</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {damages.map((damage) => (
              <TableRow
                key={damage.id}
                className="cursor-pointer"
                onClick={() => navigate(`/damages/${damage.id}`)}
              >
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-primary">
                    {damage.referenceNumber}
                  </span>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(damage.dateOfDamage)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{damage.customer?.name}</p>
                    <p className="text-xs text-muted-foreground">{damage.customer?.code}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{damage.product?.name}</p>
                    <p className="text-xs text-muted-foreground">{damage.product?.sku}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={damage.severity} />
                </TableCell>
                <TableCell className="text-sm">
                  {CAUSE_LABELS[damage.cause]}
                </TableCell>
                <TableCell>
                  <StatusBadge status={damage.status} />
                </TableCell>
                <TableCell className="text-sm">
                  {damage.reportedBy?.firstName} {damage.reportedBy?.lastName}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => navigate(`/damages/${damage.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {STATUS_TRANSITIONS[damage.status].length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {STATUS_TRANSITIONS[damage.status].map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => changeStatus.mutate({ id: damage.id, status: s })}
                            >
                              {STATUS_LABELS[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
