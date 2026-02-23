import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/database', () => ({
  default: {
    customer: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import prisma from '../config/database';
import { createCustomer } from '../services/customerService';

describe('createCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a customer when code is unique', async () => {
    (prisma.customer.findUnique as any).mockResolvedValueOnce(null);
    (prisma.customer.create as any).mockResolvedValueOnce({
      id: 'cust-1',
      name: 'Acme Corp',
      code: 'ACME',
      email: null,
      phone: null,
      contactName: null,
      _count: { damages: 0, products: 0 },
    });

    const result = await createCustomer({ name: 'Acme Corp', code: 'ACME' });
    expect(result.code).toBe('ACME');
    expect(prisma.customer.create).toHaveBeenCalledOnce();
  });

  it('throws 409 when customer code already exists', async () => {
    (prisma.customer.findUnique as any).mockResolvedValueOnce({
      id: 'existing',
      code: 'ACME',
    });

    await expect(createCustomer({ name: 'Acme Duplicate', code: 'ACME' })).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("'ACME'"),
    });
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it('upcases the code before checking uniqueness', async () => {
    (prisma.customer.findUnique as any).mockResolvedValueOnce(null);
    (prisma.customer.create as any).mockResolvedValueOnce({
      id: 'cust-2',
      name: 'Beta Ltd',
      code: 'BETA',
      email: null,
      phone: null,
      contactName: null,
      _count: { damages: 0, products: 0 },
    });

    await createCustomer({ name: 'Beta Ltd', code: 'beta' });
    expect(prisma.customer.findUnique).toHaveBeenCalledWith({ where: { code: 'BETA' } });
  });
});
