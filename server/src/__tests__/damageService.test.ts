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

describe('changeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows DRAFT → REPORTED transition', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'DRAFT' });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ firstName: 'A', lastName: 'B' });
    (prisma.damageReport.update as any).mockResolvedValueOnce({
      id: '1',
      status: 'REPORTED',
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

    const result = await changeStatus('1', DamageStatus.REPORTED, 'user1');
    expect(result.status).toBe('REPORTED');
  });

  it('rejects invalid transition DRAFT → CLOSED with 400', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'DRAFT' });

    await expect(changeStatus('1', DamageStatus.CLOSED, 'user1')).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Invalid status transition'),
    });
  });

  it('rejects CLOSED → any transition with 400', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'CLOSED' });

    await expect(changeStatus('1', DamageStatus.RESOLVED, 'user1')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('allows RESOLVED → CLOSED transition', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce({ id: '1', status: 'RESOLVED' });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ firstName: 'A', lastName: 'B' });
    (prisma.damageReport.update as any).mockResolvedValueOnce({
      id: '1',
      status: 'CLOSED',
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

    const result = await changeStatus('1', DamageStatus.CLOSED, 'user1');
    expect(result.status).toBe('CLOSED');
  });

  it('returns 404 when damage not found', async () => {
    (prisma.damageReport.findUnique as any).mockResolvedValueOnce(null);

    await expect(changeStatus('nonexistent', DamageStatus.REPORTED, 'user1')).rejects.toMatchObject({
      status: 404,
    });
  });
});
