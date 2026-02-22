import { useState, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown } from 'lucide-react';
import { Input } from '../ui/input';
import { useCustomers } from '../../hooks/useCustomers';
import { Customer } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '@/lib/utils';

interface CustomerSearchProps {
  value: string;
  onChange: (customerId: string, customer?: Customer) => void;
  placeholder?: string;
  className?: string;
}

export function CustomerSearch({ value, onChange, placeholder = 'Search customers...', className }: CustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data } = useCustomers({ search: debouncedSearch, limit: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = data?.data.find((c) => c.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? `${selected.name} (${selected.code})` : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 h-8"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {data?.data.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No customers found</p>
            ) : (
              data?.data.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-left"
                  onClick={() => {
                    onChange(customer.id, customer);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === customer.id ? 'opacity-100' : 'opacity-0')} />
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.code}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
