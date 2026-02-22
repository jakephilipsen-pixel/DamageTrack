import { Download, FileDown, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { exportCSV } from '../../api/reports';
import { toast } from 'sonner';
import { useState } from 'react';

interface ExportButtonProps {
  params?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    customerId?: string;
  };
}

export function ExportButton({ params }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleCSV = async () => {
    setIsExporting(true);
    try {
      await exportCSV(params);
      toast.success('CSV export downloaded');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting} className="gap-2">
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCSV}>
          <FileText className="mr-2 h-4 w-4" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toast.info('Use individual report PDF from the damage detail page')}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF (per report)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
