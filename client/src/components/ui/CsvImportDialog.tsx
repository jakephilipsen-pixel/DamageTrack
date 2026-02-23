import { useRef, useState } from 'react';
import { Upload, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './button';
import { Badge } from './badge';
import { ImportResult } from '../../types';
import { importCustomersCSV } from '../../api/customers';
import { importProductsCSV } from '../../api/products';
import { importUsersCSV } from '../../api/users';

interface Props {
  entity: 'customers' | 'products' | 'users';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TEMPLATES: Record<Props['entity'], { headers: string; filename: string; note?: string }> = {
  customers: {
    headers: 'name,code,email,phone,contactName',
    filename: 'customers-template.csv',
  },
  products: {
    headers: 'sku,name,customerCode,barcode,description,unitValue',
    filename: 'products-template.csv',
    note: 'customerCode must match an existing customer code',
  },
  users: {
    headers: 'email,username,firstName,lastName,password,role',
    filename: 'users-template.csv',
    note: 'role values: ADMIN | MANAGER | WAREHOUSE_USER (default)',
  },
};

const ENTITY_LABELS: Record<Props['entity'], string> = {
  customers: 'Customers',
  products: 'Products',
  users: 'Users',
};

const IMPORT_FNS: Record<Props['entity'], (file: File) => Promise<ImportResult>> = {
  customers: importCustomersCSV,
  products: importProductsCSV,
  users: importUsersCSV,
};

type State = 'idle' | 'uploading' | 'results';

export function CsvImportDialog({ entity, open, onOpenChange, onSuccess }: Props) {
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const template = TEMPLATES[entity];

  const handleClose = () => {
    setState('idle');
    setResult(null);
    setErrorMessage(null);
    if (fileRef.current) fileRef.current.value = '';
    onOpenChange(false);
  };

  const handleImportAnother = () => {
    setState('idle');
    setResult(null);
    setErrorMessage(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    const blob = new Blob([template.headers + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setState('uploading');
    setErrorMessage(null);

    try {
      const importFn = IMPORT_FNS[entity];
      const res = await importFn(file);
      setResult(res);
      setState('results');
      if (res.created > 0) {
        onSuccess();
      }
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Upload failed';
      setErrorMessage(msg);
      setState('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {ENTITY_LABELS[entity]} via CSV</DialogTitle>
        </DialogHeader>

        {state === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-medium">Step 1: Download the template</p>
              <p className="text-xs text-muted-foreground">
                Required columns: <span className="font-mono">{template.headers}</span>
              </p>
              {template.note && (
                <p className="text-xs text-muted-foreground">{template.note}</p>
              )}
              <Button variant="outline" size="sm" className="gap-2 mt-1" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="rounded-md border bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-medium">Step 2: Upload your CSV</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-input file:text-sm file:bg-background file:text-foreground hover:file:bg-muted cursor-pointer"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button className="gap-2" onClick={handleUpload}>
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </DialogFooter>
          </div>
        )}

        {state === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Importing records...</p>
          </div>
        )}

        {state === 'results' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <span className="text-sm">
                <Badge variant="default" className="mr-2">{result.created}</Badge>
                record{result.created !== 1 ? 's' : ''} imported successfully
              </span>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm font-medium text-destructive">
                    {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} skipped
                  </span>
                </div>
                <div className="rounded-md border max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Row</th>
                        <th className="px-3 py-2 text-left font-medium">Error</th>
                        <th className="px-3 py-2 text-left font-medium">Values</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2 font-mono text-center">{err.row}</td>
                          <td className="px-3 py-2 text-destructive">{err.message}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">
                            {Object.entries(err.values)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleImportAnother}>Import Another</Button>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
