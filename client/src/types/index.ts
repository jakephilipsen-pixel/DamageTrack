export type Role = 'ADMIN' | 'MANAGER' | 'WAREHOUSE_USER';
export type DamageStatus = 'DRAFT' | 'REPORTED' | 'UNDER_REVIEW' | 'CUSTOMER_NOTIFIED' | 'CLAIM_FILED' | 'RESOLVED' | 'WRITTEN_OFF' | 'CLOSED';
export type DamageSeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'TOTAL_LOSS';
export type DamageCause = 'FORKLIFT_IMPACT' | 'DROPPED_DURING_HANDLING' | 'WATER_DAMAGE' | 'CRUSH_DAMAGE' | 'PALLET_FAILURE' | 'TEMPERATURE_EXPOSURE' | 'INCORRECT_STACKING' | 'TRANSIT_DAMAGE_INBOUND' | 'TRANSIT_DAMAGE_OUTBOUND' | 'PEST_DAMAGE' | 'EXPIRED_PRODUCT' | 'PACKAGING_FAILURE' | 'UNKNOWN' | 'OTHER';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  contactName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { damages: number; products: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  barcode?: string;
  description?: string;
  unitValue?: number;
  customerId: string;
  customer?: Customer;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { damages: number };
}

export interface DamagePhoto {
  id: string;
  damageReportId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  thumbnailPath?: string;
  caption?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface DamageComment {
  id: string;
  damageReportId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
}

export interface StatusHistory {
  id: string;
  damageReportId: string;
  fromStatus?: DamageStatus;
  toStatus: DamageStatus;
  changedBy: string;
  changedByUser?: string;
  note?: string;
  createdAt: string;
}

export interface DamageReport {
  id: string;
  referenceNumber: string;
  customerId: string;
  customer: Customer;
  productId: string;
  product: Product;
  quantity: number;
  severity: DamageSeverity;
  cause: DamageCause;
  causeOther?: string;
  description: string;
  locationInWarehouse?: string;
  status: DamageStatus;
  estimatedLoss?: number;
  reportedById: string;
  reportedBy: User;
  reviewedById?: string;
  reviewedBy?: User;
  dateOfDamage: string;
  dateReported: string;
  dateResolved?: string;
  createdAt: string;
  updatedAt: string;
  photos: DamagePhoto[];
  comments?: DamageComment[];
  statusHistory?: StatusHistory[];
  emailExports?: EmailExport[];
}

export interface EmailExport {
  id: string;
  damageReportId: string;
  sentTo: string;
  sentBy: string;
  subject: string;
  includePhotos: boolean;
  sentAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  user: { username: string; firstName: string; lastName: string };
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  byStatus: { status: DamageStatus; count: number }[];
  byCause: { cause: DamageCause; count: number }[];
  byCustomer: { customerName: string; count: number }[];
  recentDamages: DamageReport[];
  totalOpenLoss: number;
}
