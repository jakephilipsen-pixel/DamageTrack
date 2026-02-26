import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Eye, MoreHorizontal, X, ChevronRight } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { StatusBadge } from './StatusBadge';
import { Skeleton } from '../ui/skeleton';
import { DamageReport, DamageStatus } from '../../types';
import { formatDate, CAUSE_LABELS, STATUS_LABELS } from '../../utils/formatters';
import { useChangeStatus, useBulkStatusChange, useBulkArchive } from '../../hooks/useDamages';
import { useAuth } from '../../hooks/useAuth';

const STATUS_TRANSITIONS: Record<DamageStatus, DamageStatus[]> = {
  OPEN: ['CUSTOMER_NOTIFIED'],
  CUSTOMER_NOTIFIED: ['DESTROY_STOCK', 'REP_COLLECT'],
  DESTROY_STOCK: ['CLOSED'],
  REP_COLLECT: ['CLOSED'],
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
  const { user } = useAuth();
  const changeStatus = useChangeStatus();
  const bulkStatusChange = useBulkStatusChange();
  const bulkArchive = useBulkArchive();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingBulkStatus, setPendingBulkStatus] = useState<DamageStatus | null>(null);
  const [pendingArchive, setPendingArchive] = useState(false);

  const allSelected = damages.length > 0 && damages.every((d) => selectedIds.has(d.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(damages.map((d) => d.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedDamages = damages.filter((d) => selectedIds.has(d.id));
  const bulkTransitionOptions: DamageStatus[] = (() => {
    if (selectedDamages.length === 0) return [];
    const sets = selectedDamages.map((d) => new Set(STATUS_TRANSITIONS[d.status]));
    const intersection = [...sets[0]].filter((s) => sets.every((set) => set.has(s)));
    return intersection;
  })();

  const allSelectedAreClosed = selectedDamages.length > 0 && selectedDamages.every((d) => d.status === 'CLOSED');

  const handleArchiveConfirm = () => {
    bulkArchive.mutate([...selectedIds], {
      onSuccess: () => {
        setSelectedIds(new Set());
        setPendingArchive(false);
      },
      onError: () => {
        setPendingArchive(false);
      },
    });
  };

  const handleBulkStatusConfirm = () => {
    if (!pendingBulkStatus) return;
    bulkStatusChange.mutate(
      { ids: [...selectedIds], status: pendingBulkStatus },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setPendingBulkStatus(null);
        },
        onError: () => {
          setPendingBulkStatus(null);
        },
      }
    );
  };

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

  const BulkActionBar = () => (
    someSelected && isManagerOrAdmin ? (
      <div className="flex items-center gap-3 rounded-md border bg-muted/60 px-4 py-2 text-sm">
        <span className="font-medium">{selectedIds.size} selected</span>
        {bulkTransitionOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Change Status</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Set status to…</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {bulkTransitionOptions.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setPendingBulkStatus(s)}>
                  {STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {allSelectedAreClosed && (
          <Button variant="outline" size="sm" onClick={() => setPendingArchive(true)}>
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedIds(new Set())}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    ) : null
  );

  return (
    <div className="space-y-4">
      <BulkActionBar />

      {/* ── Mobile card list (hidden on md+) ── */}
      <div className="md:hidden space-y-2">
        {damages.map((damage) => (
          <div
            key={damage.id}
            className="rounded-lg border p-3 cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors"
            onClick={() => navigate(`/damages/${damage.id}`)}
          >
            <div className="flex items-start gap-3">
              {isManagerOrAdmin && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(damage.id)}
                  onChange={() => toggleOne(damage.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                  aria-label={`Select ${damage.referenceNumber}`}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    {damage.referenceNumber}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={damage.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium mt-1 truncate">{damage.customer?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{damage.product?.name}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{formatDate(damage.dateOfDamage)}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {damage.reportedBy?.firstName} {damage.reportedBy?.lastName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop / tablet table (hidden below md) ── */}
      <div className="hidden md:block overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isManagerOrAdmin && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-input"
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Reference</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              {/* Cause: visible on xl+ only */}
              <TableHead className="hidden xl:table-cell">Cause</TableHead>
              <TableHead>Status</TableHead>
              {/* Reported By: visible on lg+ only */}
              <TableHead className="hidden lg:table-cell">Reported By</TableHead>
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
                {isManagerOrAdmin && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(damage.id)}
                      onChange={() => toggleOne(damage.id)}
                      className="h-4 w-4 rounded border-input"
                      aria-label={`Select ${damage.referenceNumber}`}
                    />
                  </TableCell>
                )}
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
                <TableCell className="hidden xl:table-cell text-sm">
                  {CAUSE_LABELS[damage.cause]}
                </TableCell>
                <TableCell>
                  <StatusBadge status={damage.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
            <span className="hidden sm:inline"> ({pagination.total} total)</span>
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

      {/* Bulk status confirmation dialog */}
      <AlertDialog
        open={pendingBulkStatus !== null}
        onOpenChange={(open) => { if (!open) setPendingBulkStatus(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Change {selectedIds.size} report(s) to{' '}
              <strong>{pendingBulkStatus ? STATUS_LABELS[pendingBulkStatus] : ''}</strong>?
              Some reports may be skipped if the transition is not valid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatusConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk archive confirmation dialog */}
      <AlertDialog
        open={pendingArchive}
        onOpenChange={(open) => { if (!open) setPendingArchive(false); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Reports</AlertDialogTitle>
            <AlertDialogDescription>
              Archive {selectedIds.size} closed report(s)? Archived reports will be
              hidden from the default list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
