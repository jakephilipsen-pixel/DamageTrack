import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const damageSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'TOTAL_LOSS']),
  cause: z.enum(['FORKLIFT_IMPACT', 'DROPPED_DURING_HANDLING', 'WATER_DAMAGE', 'CRUSH_DAMAGE', 'PALLET_FAILURE', 'TEMPERATURE_EXPOSURE', 'INCORRECT_STACKING', 'TRANSIT_DAMAGE_INBOUND', 'TRANSIT_DAMAGE_OUTBOUND', 'PEST_DAMAGE', 'EXPIRED_PRODUCT', 'PACKAGING_FAILURE', 'UNKNOWN', 'OTHER']),
  causeOther: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  locationInWarehouse: z.string().optional(),
  dateOfDamage: z.string().min(1, 'Date of damage is required'),
  estimatedLoss: z.number().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2).max(20).toUpperCase(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  contactName: z.string().optional(),
});

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  barcode: z.string().optional(),
  description: z.string().optional(),
  unitValue: z.number().min(0).optional(),
  customerId: z.string().min(1, 'Customer is required'),
});

export const userSchema = z.object({
  email: z.string().email('Valid email required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  role: z.enum(['ADMIN', 'MANAGER', 'WAREHOUSE_USER']),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
