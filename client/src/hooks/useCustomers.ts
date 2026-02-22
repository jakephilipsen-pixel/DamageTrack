import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from '../api/customers';
import { toast } from 'sonner';

export function useCustomers(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => getCustomers(params),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create customer');
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update customer');
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer removed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete customer');
    },
  });
}
