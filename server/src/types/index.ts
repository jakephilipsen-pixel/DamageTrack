import { Role, DamageStatus, DamageSeverity, DamageCause } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface DamageFilters {
  search?: string;
  status?: DamageStatus;
  severity?: DamageSeverity;
  cause?: DamageCause;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  reportedById?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: Role;
    mustChangePassword: boolean;
    lastLogin: Date | null;
  };
  accessToken: string;
  refreshToken: string;
}
