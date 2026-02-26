import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/roleCheck';
import prisma from '../config/database';
import { parsePaginationParams } from '../utils/helpers';

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const warehouseLocationSchema = z.object({
  code: z.string().min(1).max(50),
  zone: z.string().max(100).optional(),
  aisle: z.string().max(100).optional(),
  rack: z.string().max(100).optional(),
  shelf: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

const updateWarehouseLocationSchema = warehouseLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);
  const search = req.query.search as string | undefined;
  const activeOnly = req.query.activeOnly === 'true';

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { zone: { contains: search, mode: 'insensitive' } },
      { aisle: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [locations, total] = await Promise.all([
    prisma.warehouseLocation.findMany({
      where,
      orderBy: { code: 'asc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.warehouseLocation.count({ where }),
  ]);

  res.json({
    data: locations,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  });
});

router.post('/', requireAdmin, validate(warehouseLocationSchema), async (req: Request, res: Response) => {
  const location = await prisma.warehouseLocation.create({
    data: req.body as z.infer<typeof warehouseLocationSchema>,
  });
  res.status(201).json({ data: location });
});

router.put('/:id', requireAdmin, validate(updateWarehouseLocationSchema), async (req: Request, res: Response) => {
  const existing = await prisma.warehouseLocation.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Warehouse location not found' });
    return;
  }

  const location = await prisma.warehouseLocation.update({
    where: { id: req.params.id },
    data: req.body as z.infer<typeof updateWarehouseLocationSchema>,
  });
  res.json({ data: location });
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.warehouseLocation.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Warehouse location not found' });
    return;
  }

  const inUse = await prisma.damageReport.count({ where: { warehouseLocationId: req.params.id } });
  if (inUse > 0) {
    res.status(409).json({ error: `Cannot delete: location is used by ${inUse} damage report(s). Deactivate it instead.` });
    return;
  }

  await prisma.warehouseLocation.delete({ where: { id: req.params.id } });
  res.json({ data: { message: 'Warehouse location deleted' } });
});

router.post('/import', requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const content = req.file.buffer.toString('utf-8');
  let rows: Record<string, string>[];

  try {
    rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    res.status(400).json({ error: 'Failed to parse CSV file' });
    return;
  }

  let created = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const code = row.code?.trim();
    if (!code) {
      errors.push({ row: rowNum, message: 'code is required' });
      continue;
    }

    try {
      await prisma.warehouseLocation.upsert({
        where: { code },
        update: {
          zone: row.zone?.trim() || null,
          aisle: row.aisle?.trim() || null,
          rack: row.rack?.trim() || null,
          shelf: row.shelf?.trim() || null,
          description: row.description?.trim() || null,
          isActive: row.isActive?.toLowerCase() !== 'false',
        },
        create: {
          code,
          zone: row.zone?.trim() || null,
          aisle: row.aisle?.trim() || null,
          rack: row.rack?.trim() || null,
          shelf: row.shelf?.trim() || null,
          description: row.description?.trim() || null,
          isActive: row.isActive?.toLowerCase() !== 'false',
        },
      });
      created++;
    } catch (err: any) {
      errors.push({ row: rowNum, message: err.message || 'Failed to import row' });
    }
  }

  res.json({ data: { created, errors } });
});

export default router;
