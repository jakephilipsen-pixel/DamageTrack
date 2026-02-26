import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MapPin, Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  useWarehouseLocations,
  useCreateWarehouseLocation,
  useUpdateWarehouseLocation,
  useDeleteWarehouseLocation,
  useImportWarehouseLocations,
} from '../hooks/useWarehouseLocations';
import { WarehouseLocation } from '../types';
import { toast } from 'sonner';

type LocationForm = {
  code: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  description?: string;
  isActive: boolean;
};

const CSV_TEMPLATE = 'code,zone,aisle,rack,shelf,description,isActive\nAISLE-A1,Aisle A,Bay 1,Rack 2,Shelf 3,General storage,true\n';

export default function WarehouseLocations() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<WarehouseLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseLocation | null>(null);

  const { data, isLoading } = useWarehouseLocations({ search, page, limit: 20 });
  const createLocation = useCreateWarehouseLocation();
  const updateLocation = useUpdateWarehouseLocation();
  const deleteLocation = useDeleteWarehouseLocation();
  const importLocations = useImportWarehouseLocations();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LocationForm>({
    defaultValues: { isActive: true },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ isActive: true });
    setShowDialog(true);
  };

  const openEdit = (loc: WarehouseLocation) => {
    setEditing(loc);
    reset({
      code: loc.code,
      zone: loc.zone ?? '',
      aisle: loc.aisle ?? '',
      rack: loc.rack ?? '',
      shelf: loc.shelf ?? '',
      description: loc.description ?? '',
      isActive: loc.isActive,
    });
    setShowDialog(true);
  };

  const onSave = async (data: LocationForm) => {
    const payload = {
      ...data,
      zone: data.zone || undefined,
      aisle: data.aisle || undefined,
      rack: data.rack || undefined,
      shelf: data.shelf || undefined,
      description: data.description || undefined,
    };

    if (editing) {
      updateLocation.mutate({ id: editing.id, payload }, { onSuccess: () => setShowDialog(false) });
    } else {
      createLocation.mutate(payload as any, { onSuccess: () => setShowDialog(false) });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteLocation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importLocations.mutate(file, {
      onSuccess: (result) => {
        if (result.errors.length > 0) {
          result.errors.forEach((err) => toast.error(`Row ${err.row}: ${err.message}`));
        }
      },
    });
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warehouse-locations-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const locations = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Warehouse Locations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage the location codes used when logging damage reports.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Template
          </Button>
          <Label htmlFor="csv-upload" className="cursor-pointer">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                Import CSV
              </span>
            </Button>
          </Label>
          <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by code, zone, or description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-sm"
            />
            {pagination && (
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                {pagination.total} location{pagination.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No locations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Code</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Zone</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Aisle / Rack / Shelf</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 px-3 font-mono font-medium">{loc.code}</td>
                      <td className="py-2 px-3 text-muted-foreground">{loc.zone ?? '—'}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {[loc.aisle, loc.rack, loc.shelf].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">{loc.description ?? '—'}</td>
                      <td className="py-2 px-3">
                        <Badge variant={loc.isActive ? 'default' : 'secondary'}>
                          {loc.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(loc)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input
                  {...register('code', { required: 'Code is required' })}
                  placeholder="e.g. AISLE-A-BAY1"
                  className="mt-1 uppercase"
                />
                {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <Label>Zone</Label>
                <Input {...register('zone')} placeholder="e.g. Aisle A" className="mt-1" />
              </div>
              <div>
                <Label>Aisle</Label>
                <Input {...register('aisle')} placeholder="e.g. Bay 3" className="mt-1" />
              </div>
              <div>
                <Label>Rack</Label>
                <Input {...register('rack')} placeholder="e.g. Rack 2" className="mt-1" />
              </div>
              <div>
                <Label>Shelf</Label>
                <Input {...register('shelf')} placeholder="e.g. Level 1" className="mt-1" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="isActive" {...register('isActive')} className="rounded" />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input {...register('description')} placeholder="Optional notes about this location" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createLocation.isPending || updateLocation.isPending}>
                {editing ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.code}</strong>? This cannot be undone.
            If any damage reports use this location, deletion will be blocked.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteLocation.isPending}>
              {deleteLocation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
