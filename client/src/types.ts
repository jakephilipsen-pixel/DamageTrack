// === API Response Types ===

export interface User {
  id: string;
  username: string;
  role: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  description: string;
  customer: string;
  active: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface Reason {
  id: string;
  text: string;
  active: boolean;
  createdAt: string;
}

export interface Photo {
  id: string;
  filename: string;
  thumbnail: string;
  reportId: string;
  createdAt: string;
}

export interface DamageReport {
  id: string;
  reference: string;
  productId: string;
  product: Product;
  employeeId: string;
  employee: Employee;
  reasonId: string;
  reason: Reason;
  faultOf: "WAREHOUSE" | "TRANSPORT";
  quantity: number;
  notes: string | null;
  dateTime: string;
  userId: string;
  user: Pick<User, "id" | "username" | "role">;
  photos: Photo[];
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

export interface CsvImportResult {
  message: string;
  created: number;
  updated: number;
  errors?: string[];
  total: number;
}

export interface ExportSummary {
  totalReports: number;
  totalQuantity: number;
  byFault: {
    warehouse: number;
    transport: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
}

export interface BulkExportResponse {
  message: string;
  summary: ExportSummary;
  reports: Array<{
    reference: string;
    dateTime: string;
    product: { sku: string; description: string; customer: string };
    employee: string;
    reason: string;
    faultOf: string;
    quantity: number;
    notes: string | null;
    createdBy: string;
    photoCount: number;
    photos: Array<{
      filename: string;
      thumbnail: string;
      url: string;
      thumbnailUrl: string;
    }>;
    createdAt: string;
  }>;
}
