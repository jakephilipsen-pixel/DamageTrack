import { useParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/skeleton';
import { DamageDetail } from '../components/damages/DamageDetail';
import { useDamage } from '../hooks/useDamages';

export default function DamageView() {
  const { id } = useParams<{ id: string }>();
  const { data: damage, isLoading, isError } = useDamage(id!);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !damage) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">Report Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The damage report you're looking for doesn't exist or you don't have permission to view it.
        </p>
      </div>
    );
  }

  return <DamageDetail damage={damage} />;
}
