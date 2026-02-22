import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DamageStatus, DamageSeverity, DamageCause } from '@prisma/client';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/roleCheck';
import * as damageService from '../services/damageService';
import { createAuditLog } from '../services/auditService';
import { parsePaginationParams, getClientIp } from '../utils/helpers';
import { DamageFilters } from '../types';

const router = Router();

const createDamageSchema = z.object({
  customerId: z.string().cuid('Invalid customer ID'),
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  severity: z.nativeEnum(DamageSeverity),
  cause: z.nativeEnum(DamageCause),
  causeOther: z.string().max(500).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  locationInWarehouse: z.string().max(200).optional(),
  estimatedLoss: z.number().nonnegative().optional(),
  dateOfDamage: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  status: z.nativeEnum(DamageStatus).optional(),
});

const updateDamageSchema = z.object({
  customerId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  quantity: z.number().int().positive().optional(),
  severity: z.nativeEnum(DamageSeverity).optional(),
  cause: z.nativeEnum(DamageCause).optional(),
  causeOther: z.string().max(500).nullable().optional(),
  description: z.string().min(10).max(5000).optional(),
  locationInWarehouse: z.string().max(200).nullable().optional(),
  estimatedLoss: z.number().nonnegative().nullable().optional(),
  dateOfDamage: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date')
    .optional(),
});

const changeStatusSchema = z.object({
  status: z.nativeEnum(DamageStatus),
  note: z.string().max(1000).optional(),
});

const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

router.get('/', async (req: Request, res: Response) => {
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);

  const filters: DamageFilters = {
    search: req.query.search as string | undefined,
    status: req.query.status as DamageStatus | undefined,
    severity: req.query.severity as DamageSeverity | undefined,
    cause: req.query.cause as DamageCause | undefined,
    customerId: req.query.customerId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    reportedById: req.query.reportedById as string | undefined,
  };

  const result = await damageService.getDamages(filters, pagination);
  res.json(result);
});

router.post('/', validate(createDamageSchema), async (req: Request, res: Response) => {
  const report = await damageService.createDamage(req.body as Parameters<typeof damageService.createDamage>[0], req.user!.userId);

  await createAuditLog({
    userId: req.user!.userId,
    action: 'CREATE',
    entity: 'DamageReport',
    entityId: report.id,
    details: { referenceNumber: report.referenceNumber },
    ipAddress: getClientIp(req),
  });

  res.status(201).json({ data: report });
});

router.get('/:id', async (req: Request, res: Response) => {
  const report = await damageService.getDamageById(req.params.id);
  res.json({ data: report });
});

router.put('/:id', validate(updateDamageSchema), async (req: Request, res: Response) => {
  const report = await damageService.updateDamage(
    req.params.id,
    req.body as Parameters<typeof damageService.updateDamage>[1],
    req.user!.userId
  );

  await createAuditLog({
    userId: req.user!.userId,
    action: 'UPDATE',
    entity: 'DamageReport',
    entityId: report.id,
    details: { referenceNumber: report.referenceNumber, updatedFields: Object.keys(req.body as object) },
    ipAddress: getClientIp(req),
  });

  res.json({ data: report });
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const report = await damageService.getDamageById(req.params.id);
  const referenceNumber = report.referenceNumber;

  await damageService.deleteDamage(req.params.id);

  await createAuditLog({
    userId: req.user!.userId,
    action: 'DELETE',
    entity: 'DamageReport',
    entityId: req.params.id,
    details: { referenceNumber },
    ipAddress: getClientIp(req),
  });

  res.json({ data: { message: 'Damage report deleted successfully' } });
});

router.patch('/:id/status', validate(changeStatusSchema), async (req: Request, res: Response) => {
  const { status, note } = req.body as { status: DamageStatus; note?: string };

  const report = await damageService.changeStatus(
    req.params.id,
    status,
    req.user!.userId,
    note
  );

  await createAuditLog({
    userId: req.user!.userId,
    action: 'STATUS_CHANGE',
    entity: 'DamageReport',
    entityId: report.id,
    details: {
      referenceNumber: report.referenceNumber,
      newStatus: status,
      note,
    },
    ipAddress: getClientIp(req),
  });

  res.json({ data: report });
});

router.get('/:id/comments', async (req: Request, res: Response) => {
  const comments = await damageService.getComments(req.params.id);
  res.json({ data: comments });
});

router.post('/:id/comments', validate(addCommentSchema), async (req: Request, res: Response) => {
  const { content } = req.body as { content: string };
  const comment = await damageService.addComment(req.params.id, req.user!.userId, content);
  res.status(201).json({ data: comment });
});

export default router;
