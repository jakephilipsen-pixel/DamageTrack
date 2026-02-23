import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDamages, getDamage, createDamage, updateDamage, deleteDamage, changeStatus, bulkStatusChange } from '../api/damages';
import { DamageFilters } from '../api/damages';
import { toast } from 'sonner';

export function useDamages(filters: DamageFilters = {}) {
  return useQuery({
    queryKey: ['damages', filters],
    queryFn: () => getDamages(filters),
  });
}

export function useDamage(id: string) {
  return useQuery({
    queryKey: ['damage', id],
    queryFn: () => getDamage(id),
    enabled: !!id,
  });
}

export function useCreateDamage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDamage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      toast.success('Damage report created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create damage report');
    },
  });
}

export function useUpdateDamage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateDamage(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['damage', id] });
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      toast.success('Damage report updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update');
    },
  });
}

export function useDeleteDamage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDamage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      toast.success('Damage report deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete');
    },
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: any; note?: string }) => changeStatus(id, status, note),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['damage', id] });
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      toast.success('Status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });
}

export function useBulkStatusChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkStatusChange,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      if (result.skipped.length > 0) {
        toast.warning(`Updated ${result.updated}, skipped ${result.skipped.length} report(s)`);
      } else {
        toast.success(`${result.updated} report(s) updated`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Bulk status change failed');
    },
  });
}
