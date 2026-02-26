import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DamageStatus } from '@prisma/client';

// Mock the database module
vi.mock('../config/database', () => ({
  default: {
    damageReport: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from '../config/database';
import { changeStatus } from '../services/damageService';

const mockUpdateResult = (status: string) => ({
  id: '1',
  status,
  referenceNumber: 'REF-001',
  estimatedLoss: null,
  customer: {},
  product: {},
  reportedBy: {},
  reviewedBy: null,
  photos: [],
  comments: [],
  statusHistory: [],
  _count: { photos: 0, comments: 0 },
});

describe('changeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows OPEN → CUSTOMER_NOTIFIED transition', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'OPEN' });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ firstName: 'A', lastName: 'B' });
    (prisma.damageReport.update as any).mockResolvedValueOnce(mockUpdateResult('CUSTOMER_NOTIFIED'));

    const result = await changeStatus('1', DamageStatus.CUSTOMER_NOTIFIED, 'user1');
    expect(result.status).toBe('CUSTOMER_NOTIFIED');
  });

  it('rejects invalid transition OPEN → CLOSED with 400', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'OPEN' });

    await expect(changeStatus('1', DamageStatus.CLOSED, 'user1')).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Invalid status transition'),
    });
  });

  it('rejects CLOSED → any transition with 400', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'CLOSED' });

    await expect(changeStatus('1', DamageStatus.CUSTOMER_NOTIFIED, 'user1')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('allows DESTROY_STOCK → CLOSED transition', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'DESTROY_STOCK' });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ firstName: 'A', lastName: 'B' });
    (prisma.damageReport.update as any).mockResolvedValueOnce(mockUpdateResult('CLOSED'));

    const result = await changeStatus('1', DamageStatus.CLOSED, 'user1');
    expect(result.status).toBe('CLOSED');
  });

  it('allows REP_COLLECT → CLOSED transition', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'REP_COLLECT' });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ firstName: 'A', lastName: 'B' });
    (prisma.damageReport.update as any).mockResolvedValueOnce(mockUpdateResult('CLOSED'));

    const result = await changeStatus('1', DamageStatus.CLOSED, 'user1');
    expect(result.status).toBe('CLOSED');
  });

  it('allows CUSTOMER_NOTIFIED → DESTROY_STOCK transition', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'CUSTOMER_NOTIFIED' });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ firstName: 'A', lastName: 'B' });
    (prisma.damageReport.update as any).mockResolvedValueOnce(mockUpdateResult('DESTROY_STOCK'));

    const result = await changeStatus('1', DamageStatus.DESTROY_STOCK, 'user1');
    expect(result.status).toBe('DESTROY_STOCK');
  });

  it('allows CUSTOMER_NOTIFIED → REP_COLLECT transition', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'CUSTOMER_NOTIFIED' });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ firstName: 'A', lastName: 'B' });
    (prisma.damageReport.update as any).mockResolvedValueOnce(mockUpdateResult('REP_COLLECT'));

    const result = await changeStatus('1', DamageStatus.REP_COLLECT, 'user1');
    expect(result.status).toBe('REP_COLLECT');
  });

  it('returns 404 when damage not found', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce(null);

    await expect(changeStatus('nonexistent', DamageStatus.CUSTOMER_NOTIFIED, 'user1')).rejects.toMatchObject({
      status: 404,
    });
  });
});
