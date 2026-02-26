import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DamageStatus, DamageSeverity, DamageCause } from '@prisma/client';
import { validate } from '../middleware/validate';
import { requireAdmin, requireManagerOrAdmin } from '../middleware/roleCheck';
import * as damageService from '../services/damageService';
import * as emailService from '../services/emailService';
import { createAuditLog } from '../services/auditService';
import { parsePaginationParams, getClientIp } from '../utils/helpers';
import { DamageFilters } from '../types';
import logger from '../utils/logger';

const router = Router();

const createDamageSchema = z.object({
  customerId: z.string().cuid('Invalid customer ID'),
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  severity: z.nativeEnum(DamageSeverity).optional(),
  cause: z.nativeEnum(DamageCause),
  causeOther: z.string().max(500).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  warehouseLocationId: z.string().cuid().optional(),
  estimatedLoss: z.number().nonnegative().optional(),
  dateOfDamage: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  status: z.nativeEnum(DamageStatus).optional(),
});

const updateDamageSchema = z.object({
  customerId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  quantity: z.number().int().positive().optional(),
  severity: z.nativeEnum(DamageSeverity).nullable().optional(),
  cause: z.nativeEnum(DamageCause).optional(),
  causeOther: z.string().max(500).nullable().optional(),
  description: z.string().min(10).max(5000).optional(),
  warehouseLocationId: z.string().cuid().nullable().optional(),
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

const bulkArchiveSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID required').max(50, 'Maximum 50 IDs'),
});

const bulkStatusSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID required').max(50, 'Maximum 50 IDs'),
  status: z.nativeEnum(DamageStatus),
  note: z.string().max(1000).optional(),
});

/**
 * @swagger
 * /damages:
 *   get:
 *     summary: List damage reports with optional filters
 *     tags: [Damages]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated damage reports
 */
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
    isArchived: req.query.isArchived === 'true' ? true : undefined,
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

/**
 * @swagger
 * /damages/bulk-status:
 *   patch:
 *     summary: Bulk change status for multiple damage reports (manager/admin)
 *     tags: [Damages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, status]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 50
 *               status:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bulk result with updated count and skipped entries
 */
router.patch('/bulk-archive', requireManagerOrAdmin, validate(bulkArchiveSchema), async (req: Request, res: Response) => {
  const { ids } = req.body as { ids: string[] };
  const result = await damageService.bulkArchive(ids);

  for (const id of ids) {
    if (!result.skipped.find((s) => s.id === id)) {
      await createAuditLog({
        userId: req.user!.userId,
        action: 'ARCHIVE',
        entity: 'DamageReport',
        entityId: id,
        details: { bulk: true },
        ipAddress: getClientIp(req),
      });
    }
  }

  res.json({ data: result });
});

router.patch('/bulk-status', requireManagerOrAdmin, validate(bulkStatusSchema), async (req: Request, res: Response) => {
  const { ids, status, note } = req.body as { ids: string[]; status: DamageStatus; note?: string };
  let updated = 0;
  const skipped: { id: string; reason: string }[] = [];

  for (const id of ids) {
    try {
      await damageService.changeStatus(id, status, req.user!.userId, note);
      await createAuditLog({
        userId: req.user!.userId,
        action: 'STATUS_CHANGE',
        entity: 'DamageReport',
        entityId: id,
        details: { newStatus: status, note, bulk: true },
        ipAddress: getClientIp(req),
      });
      updated++;
    } catch (err: any) {
      skipped.push({ id, reason: err.message || 'Unknown error' });
    }
  }

  res.json({ data: { updated, skipped } });
});

/**
 * @swagger
 * /damages/{id}:
 *   get:
 *     summary: Get a single damage report by ID
 *     tags: [Damages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Damage report
 *       404:
 *         description: Not found
 */
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

/**
 * @swagger
 * /damages/{id}/status:
 *   patch:
 *     summary: Change the status of a damage report
 *     tags: [Damages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated damage report
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Not found
 */
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

  emailService.sendStatusChangeNotification(report, req.user!.username)
    .catch((err: Error) => logger.warn('Status notification email failed', { err: err.message }));

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
