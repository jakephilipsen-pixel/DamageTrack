import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DamageStatus, DamageSeverity, DamageCause } from '@prisma/client';
import { validate } from '../middleware/validate';
import { requireManagerOrAdmin } from '../middleware/roleCheck';
import * as damageService from '../services/damageService';
import { sendDamageReport } from '../services/emailService';
import { generatePDF, streamCSV } from '../services/exportService';
import { createAuditLog } from '../services/auditService';
import { getClientIp } from '../utils/helpers';
import { format } from 'date-fns';

const router = Router();

const emailSchema = z.object({
  to: z.string().email('Invalid recipient email address'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().max(5000).default(''),
  includePhotos: z.boolean().default(true),
});

router.post('/email/:damageId', validate(emailSchema), async (req: Request, res: Response) => {
  const { to, subject, body, includePhotos } = req.body as {
    to: string;
    subject: string;
    body: string;
    includePhotos: boolean;
  };

  const report = await damageService.getDamageById(req.params.damageId);

  await sendDamageReport(report, to, subject, body, includePhotos, req.user!.userId);

  await createAuditLog({
    userId: req.user!.userId,
    action: 'EMAIL_EXPORT',
    entity: 'DamageReport',
    entityId: report.id,
    details: {
      referenceNumber: report.referenceNumber,
      sentTo: to,
      includePhotos,
    },
    ipAddress: getClientIp(req),
  });

  res.json({ data: { message: `Report ${report.referenceNumber} sent successfully to ${to}` } });
});

router.get('/pdf/:damageId', async (req: Request, res: Response) => {
  const report = await damageService.getDamageById(req.params.damageId);
  const pdfBuffer = await generatePDF(report);

  const filename = `damage-report-${report.referenceNumber}-${format(new Date(), 'yyyyMMdd')}.pdf`;

  await createAuditLog({
    userId: req.user!.userId,
    action: 'PDF_EXPORT',
    entity: 'DamageReport',
    entityId: report.id,
    details: { referenceNumber: report.referenceNumber },
    ipAddress: getClientIp(req),
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

router.get('/csv', requireManagerOrAdmin, async (req: Request, res: Response) => {
  const filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: DamageStatus;
    customerId?: string;
    severity?: DamageSeverity;
    cause?: DamageCause;
  } = {};

  if (req.query.dateFrom) filters.dateFrom = req.query.dateFrom as string;
  if (req.query.dateTo) filters.dateTo = req.query.dateTo as string;
  if (req.query.status) filters.status = req.query.status as DamageStatus;
  if (req.query.customerId) filters.customerId = req.query.customerId as string;
  if (req.query.severity) filters.severity = req.query.severity as DamageSeverity;
  if (req.query.cause) filters.cause = req.query.cause as DamageCause;

  const filename = `damage-reports-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;

  await createAuditLog({
    userId: req.user!.userId,
    action: 'CSV_EXPORT',
    entity: 'DamageReport',
    details: { filters },
    ipAddress: getClientIp(req),
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Transfer-Encoding', 'chunked');

  await streamCSV(res, filters);
});

export default router;
