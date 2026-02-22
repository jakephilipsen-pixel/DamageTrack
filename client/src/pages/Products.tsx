import { useState } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Product } from '../types';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import { useCustomers } from '../hooks/useCustomers';
import { useAuth } from '../hooks/useAuth';
import { productSchema } from '../utils/validators';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';

type ProductForm = z.infer<typeof productSchema>;

export default function Products() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const params = {
    search: debouncedSearch || undefined,
    customerId: selectedCustomer !== 'all' ? selectedCustomer : undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
  });

  const { data: customersData } = useCustomers({ limit: 200 });

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'ADMIN';

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProduct(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete product'),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  const openCreate = () => {
    reset({ sku: '', name: '', barcode: '', description: '', customerId: '', unitValue: undefined });
    setShowCreateDialog(true);
  };

  const openEdit = (product: Product) => {
    reset({
      sku: product.sku,
      name: product.name,
      barcode: product.barcode || '',
      description: product.description || '',
      customerId: product.customerId,
      unitValue: product.unitValue,
    });
    setEditProduct(product);
  };

  const onSubmit = async (data: ProductForm) => {
    const payload = { ...data, unitValue: data.unitValue || undefined };
    if (editProduct) {
      await updateMutation.mutateAsync({ id: editProduct.id, data: payload });
      setEditProduct(null);
    } else {
      await createMutation.mutateAsync(payload);
      setShowCreateDialog(false);
    }
    reset();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const dialogOpen = showCreateDialog || !!editProduct;
  const closeDialog = () => {
    setShowCreateDialog(false);
    setEditProduct(null);
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.pagination.total} products` : 'Loading...'}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by SKU or name..."
            className="pl-9"
          />
        </div>
        <Select value={selectedCustomer} onValueChange={(v) => { setSelectedCustomer(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customersData?.data.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Unit Value</TableHead>
                <TableHead>Damages</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold">{product.sku}</span>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-sm font-mono">{product.barcode || '—'}</TableCell>
                    <TableCell className="text-sm">{product.customer?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(product.unitValue)}</TableCell>
                    <TableCell className="text-sm">{product._count?.damages ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(product)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customersData?.data.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customerId && <p className="text-xs text-destructive mt-1">{errors.customerId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SKU *</Label>
                <Input {...register('sku')} className="mt-1" placeholder="PROD-001" />
                {errors.sku && <p className="text-xs text-destructive mt-1">{errors.sku.message}</p>}
              </div>
              <div>
                <Label>Name *</Label>
                <Input {...register('name')} className="mt-1" placeholder="Product name" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Barcode</Label>
                <Input {...register('barcode')} className="mt-1" placeholder="Optional" />
              </div>
              <div>
                <Label>Unit Value (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...register('unitValue', { valueAsNumber: true, setValueAs: v => v === '' ? undefined : Number(v) })}
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea {...register('description')} className="mt-1" placeholder="Optional description" rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {isSubmitting ? 'Saving...' : editProduct ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.sku})?
              This will fail if the product has associated damage reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
