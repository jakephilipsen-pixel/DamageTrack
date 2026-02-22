import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PhotoUploader } from './PhotoUploader';
import { StatusBadge, SeverityBadge } from './StatusBadge';
import { useCustomers } from '../../hooks/useCustomers';
import { useCreateDamage } from '../../hooks/useDamages';
import { getProducts } from '../../api/products';
import { uploadPhotos } from '../../api/damages';
import { Product } from '../../types';
import { CAUSE_LABELS, SEVERITY_LABELS, formatCurrency, formatDate } from '../../utils/formatters';
import { DamageCause, DamageSeverity } from '../../types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const step1Schema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
});

const step2Schema = z.object({
  productId: z.string().min(1, 'Product is required'),
});

const step3Schema = z.object({
  quantity: z.number({ invalid_type_error: 'Must be a number' }).int().min(1, 'Quantity must be at least 1'),
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'TOTAL_LOSS'] as const),
  cause: z.enum(['FORKLIFT_IMPACT', 'DROPPED_DURING_HANDLING', 'WATER_DAMAGE', 'CRUSH_DAMAGE', 'PALLET_FAILURE', 'TEMPERATURE_EXPOSURE', 'INCORRECT_STACKING', 'TRANSIT_DAMAGE_INBOUND', 'TRANSIT_DAMAGE_OUTBOUND', 'PEST_DAMAGE', 'EXPIRED_PRODUCT', 'PACKAGING_FAILURE', 'UNKNOWN', 'OTHER'] as const),
  causeOther: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  locationInWarehouse: z.string().optional(),
  dateOfDamage: z.string().min(1, 'Date of damage is required'),
  estimatedLoss: z.number().optional(),
});

type FormData = {
  customerId: string;
  productId: string;
  quantity: number;
  severity: DamageSeverity;
  cause: DamageCause;
  causeOther?: string;
  description: string;
  locationInWarehouse?: string;
  dateOfDamage: string;
  estimatedLoss?: number;
};

const STEPS = [
  { label: 'Customer', description: 'Select customer' },
  { label: 'Product', description: 'Select product' },
  { label: 'Details', description: 'Damage details' },
  { label: 'Photos', description: 'Upload photos' },
  { label: 'Review', description: 'Review & submit' },
];

export function DamageForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: customersData, isLoading: loadingCustomers } = useCustomers({ search: customerSearch, limit: 100 });
  const createDamage = useCreateDamage();

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      quantity: 1,
      dateOfDamage: new Date().toISOString().split('T')[0],
    },
  });

  const watchedCustomerId = watch('customerId');
  const watchedCause = watch('cause');
  const watchedProductId = watch('productId');

  useEffect(() => {
    if (watchedCustomerId) {
      setLoadingProducts(true);
      getProducts({ customerId: watchedCustomerId, limit: 200 })
        .then((res) => setProducts(res.data))
        .catch(() => setProducts([]))
        .finally(() => setLoadingProducts(false));
      setValue('productId', '');
    }
  }, [watchedCustomerId]);

  const selectedCustomer = customersData?.data.find((c) => c.id === watchedCustomerId);
  const selectedProduct = products.find((p) => p.id === watchedProductId);

  const filteredProducts = products.filter(
    (p) =>
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const goNext = async () => {
    let valid = false;
    if (step === 1) valid = await trigger('customerId');
    else if (step === 2) valid = await trigger('productId');
    else if (step === 3) {
      valid = await trigger(['quantity', 'severity', 'cause', 'description', 'dateOfDamage']);
    } else {
      valid = true;
    }
    if (valid) setStep((s) => s + 1);
  };

  const goPrev = () => setStep((s) => s - 1);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const created = await createDamage.mutateAsync(data);
      if (photos.length > 0) {
        try {
          await uploadPhotos(created.id, photos);
        } catch {
          toast.warning('Report created but photos failed to upload. You can add them from the detail view.');
        }
      }
      navigate(`/damages/${created.id}`);
    } catch {
      // error already handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const values = getValues();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, index) => {
          const num = index + 1;
          const isCompleted = num < step;
          const isActive = num === step;
          return (
            <div key={num} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isActive && 'border-primary text-primary',
                    !isCompleted && !isActive && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : num}
                </div>
                <div className="mt-1 text-center hidden sm:block">
                  <p className={cn('text-xs font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                    {s.label}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-2', num < step ? 'bg-primary' : 'bg-muted')} />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Customer */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Search Customer</Label>
                <Input
                  placeholder="Type to search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="mt-1"
                />
              </div>
              {errors.customerId && (
                <p className="text-sm text-destructive">{errors.customerId.message}</p>
              )}
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {loadingCustomers ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading customers...</p>
                ) : customersData?.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No customers found</p>
                ) : (
                  customersData?.data.map((customer) => (
                    <Controller
                      key={customer.id}
                      name="customerId"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <button
                          type="button"
                          onClick={() => field.onChange(customer.id)}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                            field.value === customer.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          )}
                        >
                          <div>
                            <p className="font-medium text-sm">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.code}</p>
                          </div>
                          {field.value === customer.id && (
                            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </button>
                      )}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Product */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Product</CardTitle>
              {selectedCustomer && (
                <p className="text-sm text-muted-foreground">Customer: <strong>{selectedCustomer.name}</strong></p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Search Product</Label>
                <Input
                  placeholder="Search by SKU or name..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="mt-1"
                />
              </div>
              {errors.productId && (
                <p className="text-sm text-destructive">{errors.productId.message}</p>
              )}
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {loadingProducts ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading products...</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {products.length === 0 ? 'No products for this customer' : 'No products match your search'}
                  </p>
                ) : (
                  filteredProducts.map((product) => (
                    <Controller
                      key={product.id}
                      name="productId"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <button
                          type="button"
                          onClick={() => field.onChange(product.id)}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                            field.value === product.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          )}
                        >
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              SKU: {product.sku}
                              {product.unitValue != null && ` • ${formatCurrency(product.unitValue)}/unit`}
                            </p>
                          </div>
                          {field.value === product.id && (
                            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </button>
                      )}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Damage Details */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Damage Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity Damaged *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    {...register('quantity', { valueAsNumber: true })}
                    className="mt-1"
                  />
                  {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity.message}</p>}
                </div>
                <div>
                  <Label htmlFor="dateOfDamage">Date of Damage *</Label>
                  <Input
                    id="dateOfDamage"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    {...register('dateOfDamage')}
                    className="mt-1"
                  />
                  {errors.dateOfDamage && <p className="text-xs text-destructive mt-1">{errors.dateOfDamage.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Severity *</Label>
                  <Controller
                    name="severity"
                    control={control}
                    rules={{ required: 'Severity is required' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(SEVERITY_LABELS) as DamageSeverity[]).map((s) => (
                            <SelectItem key={s} value={s}>{SEVERITY_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.severity && <p className="text-xs text-destructive mt-1">{errors.severity.message}</p>}
                </div>
                <div>
                  <Label htmlFor="estimatedLoss">Estimated Loss (USD)</Label>
                  <Input
                    id="estimatedLoss"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    {...register('estimatedLoss', { valueAsNumber: true, setValueAs: v => v === '' ? undefined : Number(v) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Cause *</Label>
                <Controller
                  name="cause"
                  control={control}
                  rules={{ required: 'Cause is required' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select cause of damage" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CAUSE_LABELS) as DamageCause[]).map((c) => (
                          <SelectItem key={c} value={c}>{CAUSE_LABELS[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.cause && <p className="text-xs text-destructive mt-1">{errors.cause.message}</p>}
              </div>

              {watchedCause === 'OTHER' && (
                <div>
                  <Label htmlFor="causeOther">Specify Cause</Label>
                  <Input
                    id="causeOther"
                    {...register('causeOther')}
                    placeholder="Describe the cause..."
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe the damage in detail (min. 10 characters)..."
                  className="mt-1 min-h-[100px]"
                />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
              </div>

              <div>
                <Label htmlFor="locationInWarehouse">Location in Warehouse</Label>
                <Input
                  id="locationInWarehouse"
                  {...register('locationInWarehouse')}
                  placeholder="e.g. Aisle B, Row 3, Shelf 2"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Photos */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Photos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Photos are optional but strongly recommended for documentation. Up to 10 photos.
              </p>
            </CardHeader>
            <CardContent>
              <PhotoUploader files={photos} onChange={setPhotos} maxFiles={10} />
            </CardContent>
          </Card>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
              <p className="text-sm text-muted-foreground">Please review the details before submitting.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
                  <p className="mt-1 font-medium">{selectedCustomer?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer?.code}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</p>
                  <p className="mt-1 font-medium">{selectedProduct?.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {selectedProduct?.sku}</p>
                </div>
              </div>

              <hr />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quantity</p>
                  <p className="mt-1 font-medium">{values.quantity} units</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Severity</p>
                  <div className="mt-1">
                    {values.severity && <SeverityBadge severity={values.severity} />}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Est. Loss</p>
                  <p className="mt-1 font-medium">{formatCurrency(values.estimatedLoss)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Damage</p>
                  <p className="mt-1 font-medium">
                    {values.dateOfDamage ? formatDate(values.dateOfDamage) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cause</p>
                  <p className="mt-1 font-medium">
                    {values.cause ? CAUSE_LABELS[values.cause] : '—'}
                    {values.causeOther && `: ${values.causeOther}`}
                  </p>
                </div>
              </div>

              {values.locationInWarehouse && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
                  <p className="mt-1 font-medium">{values.locationInWarehouse}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                <p className="mt-1 text-sm">{values.description}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Photos</p>
                <p className="mt-1 text-sm">{photos.length} photo(s) to upload</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            disabled={step === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {step < 5 ? (
            <Button type="button" onClick={goNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
