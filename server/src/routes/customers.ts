import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAdmin, requireManagerOrAdmin } from '../middleware/roleCheck';
import * as customerService from '../services/customerService';
import { createAuditLog } from '../services/auditService';
import { parsePaginationParams, getClientIp } from '../utils/helpers';

const router = Router();

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  contactName: z.string().max(100).optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().max(30).nullable().optional(),
  contactName: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);
  const search = req.query.search as string | undefined;
  const includeInactive = req.query.includeInactive === 'true';

  const result = await customerService.getCustomers(
    search,
    pagination.page,
    pagination.limit,
    includeInactive
  );

  res.json(result);
});

router.post('/', requireManagerOrAdmin, validate(createCustomerSchema), async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer(
    req.body as Parameters<typeof customerService.createCustomer>[0]
  );

  await createAuditLog({
    userId: req.user!.userId,
    action: 'CREATE',
    entity: 'Customer',
    entityId: customer.id,
    details: { name: customer.name, code: customer.code },
    ipAddress: getClientIp(req),
  });

  res.status(201).json({ data: customer });
});

router.get('/:id', async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(req.params.id);
  res.json({ data: customer });
});

router.put('/:id', requireManagerOrAdmin, validate(updateCustomerSchema), async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomer(
    req.params.id,
    req.body as Parameters<typeof customerService.updateCustomer>[1]
  );

  await createAuditLog({
    userId: req.user!.userId,
    action: 'UPDATE',
    entity: 'Customer',
    entityId: customer.id,
    details: { name: customer.name, updatedFields: Object.keys(req.body as object) },
    ipAddress: getClientIp(req),
  });

  res.json({ data: customer });
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const result = await customerService.deleteCustomer(req.params.id);

  await createAuditLog({
    userId: req.user!.userId,
    action: result.softDeleted ? 'DEACTIVATE' : 'DELETE',
    entity: 'Customer',
    entityId: req.params.id,
    details: { softDeleted: result.softDeleted },
    ipAddress: getClientIp(req),
  });

  if (result.softDeleted) {
    res.json({
      data: {
        message: 'Customer has existing damage reports and has been deactivated rather than deleted.',
        softDeleted: true,
      },
    });
  } else {
    res.json({ data: { message: 'Customer deleted successfully', softDeleted: false } });
  }
});

export default router;
