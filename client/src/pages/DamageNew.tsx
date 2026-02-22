import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { DamageForm } from '../components/damages/DamageForm';

export default function DamageNew() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/damages')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold">New Damage Report</h2>
          <p className="text-sm text-muted-foreground">Complete all steps to file a damage report</p>
        </div>
      </div>

      <DamageForm />
    </div>
  );
}
