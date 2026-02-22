import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/roleCheck';
import { getAuditLogs } from '../services/auditService';
import { parsePaginationParams } from '../utils/helpers';
import prisma from '../config/database';

const router = Router();

router.use(requireAdmin);

router.get('/audit-logs', async (req: Request, res: Response) => {
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);

  const result = await getAuditLogs({
    userId: req.query.userId as string | undefined,
    action: req.query.action as string | undefined,
    entity: req.query.entity as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: pagination.page,
    limit: pagination.limit,
  });

  res.json(result);
});

router.get('/settings', async (_req: Request, res: Response) => {
  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: 'asc' },
  });

  const settingsObject = settings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  res.json({ data: settingsObject });
});

router.put('/settings', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    res.status(400).json({ error: 'Request body must be an object of key-value pairs' });
    return;
  }

  const entries = Object.entries(body);

  if (entries.length === 0) {
    res.status(400).json({ error: 'No settings provided to update' });
    return;
  }

  for (const [, value] of entries) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      res.status(400).json({ error: 'Setting values must be strings, numbers, or booleans' });
      return;
    }
  }

  const updatePromises = entries.map(([key, value]) =>
    prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  );

  await Promise.all(updatePromises);

  const updatedSettings = await prisma.systemSetting.findMany({
    orderBy: { key: 'asc' },
  });

  const settingsObject = updatedSettings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  res.json({ data: settingsObject });
});

export default router;
