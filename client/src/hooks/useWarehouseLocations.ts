import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getWarehouseLocations,
  createWarehouseLocation,
  updateWarehouseLocation,
  deleteWarehouseLocation,
  importWarehouseLocations,
  WarehouseLocationFilters,
} from '../api/warehouseLocations';

export function useWarehouseLocations(filters: WarehouseLocationFilters = {}) {
  return useQuery({
    queryKey: ['warehouseLocations', filters],
    queryFn: () => getWarehouseLocations(filters),
  });
}

export function useCreateWarehouseLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWarehouseLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouseLocations'] });
      toast.success('Location created');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create location');
    },
  });
}

export function useUpdateWarehouseLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateWarehouseLocation>[1] }) =>
      updateWarehouseLocation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouseLocations'] });
      toast.success('Location updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update location');
    },
  });
}

export function useDeleteWarehouseLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWarehouseLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouseLocations'] });
      toast.success('Location deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete location');
    },
  });
}

export function useImportWarehouseLocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importWarehouseLocations,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['warehouseLocations'] });
      if (result.errors.length === 0) {
        toast.success(`Imported ${result.created} location(s)`);
      } else {
        toast.warning(`Imported ${result.created} location(s) with ${result.errors.length} error(s)`);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Import failed');
    },
  });
}
