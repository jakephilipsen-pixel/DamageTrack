import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { DamageStatus, DamageSeverity, DamageCause } from '../types';

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export const STATUS_LABELS: Record<DamageStatus, string> = {
  OPEN: 'Open',
  CUSTOMER_NOTIFIED: 'Customer Notified',
  DESTROY_STOCK: 'Destroy Stock',
  REP_COLLECT: 'Rep Collect',
  CLOSED: 'Closed',
};

export const STATUS_COLORS: Record<DamageStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  CUSTOMER_NOTIFIED: 'bg-amber-100 text-amber-700',
  DESTROY_STOCK: 'bg-red-100 text-red-700',
  REP_COLLECT: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-green-100 text-green-700',
};

export const SEVERITY_LABELS: Record<DamageSeverity, string> = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  MAJOR: 'Major',
  TOTAL_LOSS: 'Total Loss',
};

export const SEVERITY_COLORS: Record<DamageSeverity, string> = {
  MINOR: 'bg-green-100 text-green-700',
  MODERATE: 'bg-yellow-100 text-yellow-700',
  MAJOR: 'bg-orange-100 text-orange-700',
  TOTAL_LOSS: 'bg-red-100 text-red-800',
};

export const CAUSE_LABELS: Record<DamageCause, string> = {
  FORKLIFT_IMPACT: 'Forklift Impact',
  DROPPED_DURING_HANDLING: 'Dropped During Handling',
  WATER_DAMAGE: 'Water Damage',
  CRUSH_DAMAGE: 'Crush Damage',
  PALLET_FAILURE: 'Pallet Failure',
  TEMPERATURE_EXPOSURE: 'Temperature Exposure',
  INCORRECT_STACKING: 'Incorrect Stacking',
  TRANSIT_DAMAGE_INBOUND: 'Transit Damage (Inbound)',
  TRANSIT_DAMAGE_OUTBOUND: 'Transit Damage (Outbound)',
  PEST_DAMAGE: 'Pest Damage',
  EXPIRED_PRODUCT: 'Expired Product',
  PACKAGING_FAILURE: 'Packaging Failure',
  UNKNOWN: 'Unknown',
  OTHER: 'Other',
};
