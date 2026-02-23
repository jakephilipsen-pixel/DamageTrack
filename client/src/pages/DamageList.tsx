import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DamageFilters } from '../components/damages/DamageFilters';
import { DamageTable } from '../components/damages/DamageTable';
import { useDamages } from '../hooks/useDamages';
import { useAuth } from '../hooks/useAuth';
import { DamageFilters as Filters } from '../api/damages';

export default function DamageList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isWarehouseUser = user?.role === 'WAREHOUSE_USER';

  const [filters, setFilters] = useState<Filters>(() => ({
    page: 1,
    limit: 20,
    ...(isWarehouseUser ? { reportedById: user?.id } : {}),
  }));

  const { data, isLoading } = useDamages(filters);

  const handleFilterChange = (newFilters: Filters) => {
    // Preserve the reportedById lock for warehouse users
    setFilters(isWarehouseUser ? { ...newFilters, reportedById: user?.id } : newFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{isWarehouseUser ? 'My Reports' : 'Damage Reports'}</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.pagination.total} ${isWarehouseUser ? 'reports submitted by you' : 'total reports'}` : 'Loading...'}
          </p>
        </div>
        <Button onClick={() => navigate('/damages/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Report</span>
        </Button>
      </div>

      <DamageFilters filters={filters} onChange={handleFilterChange} simplified={isWarehouseUser} />

      <DamageTable
        damages={data?.data || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) => handleFilterChange({ ...filters, page })}
      />
    </div>
  );
}
