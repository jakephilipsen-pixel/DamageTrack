import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useDebounce } from '../../hooks/useDebounce';
import { useCustomers } from '../../hooks/useCustomers';
import { DamageFilters as Filters } from '../../api/damages';
import { STATUS_LABELS, SEVERITY_LABELS, CAUSE_LABELS } from '../../utils/formatters';
import { DamageStatus, DamageSeverity, DamageCause } from '../../types';

interface DamageFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function DamageFilters({ filters, onChange }: DamageFiltersProps) {
  const [search, setSearch] = useState(filters.search || '');
  const debouncedSearch = useDebounce(search, 400);
  const { data: customersData } = useCustomers({ limit: 200 });

  useEffect(() => {
    onChange({ ...filters, search: debouncedSearch, page: 1 });
  }, [debouncedSearch]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value === 'all' ? undefined : value, page: 1 });
  };

  const clearAll = () => {
    setSearch('');
    onChange({ page: 1, limit: filters.limit });
  };

  const activeCount = [
    filters.status,
    filters.severity,
    filters.cause,
    filters.customerId,
    filters.dateFrom,
    filters.dateTo,
    filters.search,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, customer, product..."
            className="pl-9"
          />
        </div>

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => handleFilterChange('status', v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as DamageStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.severity || 'all'}
          onValueChange={(v) => handleFilterChange('severity', v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {(Object.keys(SEVERITY_LABELS) as DamageSeverity[]).map((s) => (
              <SelectItem key={s} value={s}>{SEVERITY_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.cause || 'all'}
          onValueChange={(v) => handleFilterChange('cause', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Causes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Causes</SelectItem>
            {(Object.keys(CAUSE_LABELS) as DamageCause[]).map((c) => (
              <SelectItem key={c} value={c}>{CAUSE_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.customerId || 'all'}
          onValueChange={(v) => handleFilterChange('customerId', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customersData?.data.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">From:</label>
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value || 'all')}
            className="w-40 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">To:</label>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value || 'all')}
            className="w-40 h-9"
          />
        </div>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Clear filters ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
