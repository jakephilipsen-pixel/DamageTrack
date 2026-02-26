import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireAdmin, requireManagerOrAdmin } from '../middleware/roleCheck';
import { uploadLimiter } from '../middleware/rateLimiter';
import { createAuditLog } from '../services/auditService';
import { getClientIp } from '../utils/helpers';
import prisma from '../config/database';

const router = Router();
const BCRYPT_ROUNDS = 12;

const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

type ImportError = { row: number; message: string; values: Record<string, string> };

async function parseCSV(buffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    parse(buffer, { columns: true, skip_empty_lines: true, trim: true }, (err, records) => {
      if (err) reject(err);
      else resolve(records as Record<string, string>[]);
    });
  });
}

// Schemas reused from existing routes (inline, no import coupling)
const customerImportSchema = z.object({
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

const productImportSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Name is required').max(200),
  customerCode: z.string().min(1, 'customerCode is required'),
  barcode: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  unitValue: z.string().optional(),
});

const userImportSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  role: z.nativeEnum(Role).optional(),
});

/**
 * @swagger
 * /import/customers:
 *   post:
 *     summary: Bulk import customers from CSV (manager/admin)
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import result with created count and errors
 */
// POST /api/import/customers
router.post('/customers', requireManagerOrAdmin, uploadLimiter, csvUpload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  let rows: Record<string, string>[];
  try {
    rows = await parseCSV(req.file.buffer);
  } catch (e: any) {
    res.status(400).json({ error: `CSV parse error: ${e.message}` });
    return;
  }

  let created = 0;
  const errors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-based + header row
    const raw = rows[i];

    const parsed = customerImportSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: rowNum, message: parsed.error.errors[0].message, values: raw });
      continue;
    }

    const { name, code, email, phone, contactName } = parsed.data;

    try {
      const existing = await prisma.customer.findUnique({ where: { code: code.toUpperCase() } });
      if (existing) {
        errors.push({ row: rowNum, message: `Customer with code '${code}' already exists`, values: raw });
        continue;
      }

      const customer = await prisma.customer.create({
        data: {
          name: name.trim(),
          code: code.toUpperCase().trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          contactName: contactName?.trim() || null,
        },
      });

      await createAuditLog({
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'Customer',
        entityId: customer.id,
        details: { name: customer.name, code: customer.code, source: 'csv_import' },
        ipAddress: getClientIp(req),
      });

      created++;
    } catch (e: any) {
      errors.push({ row: rowNum, message: e.message || 'Database error', values: raw });
    }
  }

  res.json({ data: { created, errors } });
});

/**
 * @swagger
 * /import/products:
 *   post:
 *     summary: Bulk import products from CSV (manager/admin)
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import result
 */
// POST /api/import/products
router.post('/products', requireManagerOrAdmin, uploadLimiter, csvUpload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  let rows: Record<string, string>[];
  try {
    rows = await parseCSV(req.file.buffer);
  } catch (e: any) {
    res.status(400).json({ error: `CSV parse error: ${e.message}` });
    return;
  }

  let created = 0;
  const errors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const raw = rows[i];

    const parsed = productImportSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: rowNum, message: parsed.error.errors[0].message, values: raw });
      continue;
    }

    const { sku, name, customerCode, barcode, description, unitValue: unitValueStr } = parsed.data;

    try {
      const customer = await prisma.customer.findUnique({
        where: { code: customerCode.toUpperCase() },
      });
      if (!customer) {
        errors.push({ row: rowNum, message: `Customer with code '${customerCode}' not found`, values: raw });
        continue;
      }

      const existing = await prisma.product.findUnique({
        where: { sku_customerId: { sku: sku.toUpperCase(), customerId: customer.id } },
      });
      if (existing) {
        errors.push({
          row: rowNum,
          message: `Product with SKU '${sku}' already exists for customer '${customerCode}'`,
          values: raw,
        });
        continue;
      }

      let unitValue: number | null = null;
      if (unitValueStr && unitValueStr.trim() !== '') {
        const parsed = parseFloat(unitValueStr);
        if (isNaN(parsed) || parsed < 0) {
          errors.push({ row: rowNum, message: 'unitValue must be a non-negative number', values: raw });
          continue;
        }
        unitValue = parsed;
      }

      const product = await prisma.product.create({
        data: {
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          barcode: barcode?.trim() || null,
          description: description?.trim() || null,
          unitValue,
          customerId: customer.id,
        },
      });

      await createAuditLog({
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'Product',
        entityId: product.id,
        details: { sku: product.sku, name: product.name, source: 'csv_import' },
        ipAddress: getClientIp(req),
      });

      created++;
    } catch (e: any) {
      errors.push({ row: rowNum, message: e.message || 'Database error', values: raw });
    }
  }

  res.json({ data: { created, errors } });
});

/**
 * @swagger
 * /import/users:
 *   post:
 *     summary: Bulk import users from CSV (admin only)
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import result
 */
// POST /api/import/users
router.post('/users', requireAdmin, uploadLimiter, csvUpload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  let rows: Record<string, string>[];
  try {
    rows = await parseCSV(req.file.buffer);
  } catch (e: any) {
    res.status(400).json({ error: `CSV parse error: ${e.message}` });
    return;
  }

  let created = 0;
  const errors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const raw = rows[i];

    const parsed = userImportSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: rowNum, message: parsed.error.errors[0].message, values: raw });
      continue;
    }

    const { email, username, firstName, lastName, password, role } = parsed.data;

    try {
      const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingEmail) {
        errors.push({ row: rowNum, message: `A user with email '${email}' already exists`, values: raw });
        continue;
      }

      const existingUsername = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
      if (existingUsername) {
        errors.push({ row: rowNum, message: `A user with username '${username}' already exists`, values: raw });
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
          password: hashedPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: role ?? Role.WAREHOUSE_USER,
          mustChangePassword: true,
        },
      });

      await createAuditLog({
        userId: req.user!.userId,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: user.id,
        details: { username: user.username, role: user.role, source: 'csv_import' },
        ipAddress: getClientIp(req),
      });

      created++;
    } catch (e: any) {
      errors.push({ row: rowNum, message: e.message || 'Database error', values: raw });
    }
  }

  res.json({ data: { created, errors } });
});

export default router;
