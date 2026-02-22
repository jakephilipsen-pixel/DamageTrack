import { format, startOfDay } from 'date-fns';
import prisma from '../config/database';
import { Request } from 'express';

export async function generateReferenceNumber(): Promise<string> {
  const today = new Date();
  const dateStr = format(today, 'yyyyMMdd');
  const todayStart = startOfDay(today);
  const count = await prisma.damageReport.count({
    where: { dateReported: { gte: todayStart } },
  });
  return `DMG-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function parsePaginationParams(query: Record<string, unknown>): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '25'), 10) || 25));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

export function serializeDecimal<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) {
      (result as Record<string, unknown>)[field as string] = Number(result[field]);
    }
  }
  return result;
}
