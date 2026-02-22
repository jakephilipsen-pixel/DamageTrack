import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DamageFilters } from '../components/damages/DamageFilters';
import { DamageTable } from '../components/damages/DamageTable';
import { useDamages } from '../hooks/useDamages';
import { DamageFilters as Filters } from '../api/damages';

export default function DamageList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });

  const { data, isLoading } = useDamages(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Damage Reports</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.pagination.total} total reports` : 'Loading...'}
          </p>
        </div>
        <Button onClick={() => navigate('/damages/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      <DamageFilters filters={filters} onChange={setFilters} />

      <DamageTable
        damages={data?.data || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </div>
  );
}
