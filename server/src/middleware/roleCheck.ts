import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

const roleHierarchy: Record<Role, number> = {
  ADMIN: 3,
  MANAGER: 2,
  WAREHOUSE_USER: 1,
};

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userLevel = roleHierarchy[req.user.role];
    const requiredLevel = Math.min(...roles.map((r) => roleHierarchy[r]));
    if (userLevel < requiredLevel) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole(Role.ADMIN);
export const requireManager = requireRole(Role.MANAGER);
export const requireManagerOrAdmin = requireRole(Role.MANAGER, Role.ADMIN);
