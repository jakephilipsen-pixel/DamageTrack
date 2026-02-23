import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAdmin, requireManagerOrAdmin } from '../middleware/roleCheck';
import * as productService from '../services/productService';
import { createAuditLog } from '../services/auditService';
import { parsePaginationParams, getClientIp } from '../utils/helpers';

const router = Router();

const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Name is required').max(200),
  barcode: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  unitValue: z.number().nonnegative('Unit value cannot be negative').optional(),
  customerId: z.string().cuid('Invalid customer ID'),
});

const updateProductSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  barcode: z.string().max(100).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  unitValue: z.number().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated product list
 */
router.get('/', async (req: Request, res: Response) => {
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);
  const search = req.query.search as string | undefined;
  const customerId = req.query.customerId as string | undefined;

  const result = await productService.getProducts(
    search,
    customerId,
    pagination.page,
    pagination.limit
  );

  res.json(result);
});

router.post('/', requireManagerOrAdmin, validate(createProductSchema), async (req: Request, res: Response) => {
  const product = await productService.createProduct(
    req.body as Parameters<typeof productService.createProduct>[0]
  );

  await createAuditLog({
    userId: req.user!.userId,
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    details: { sku: product.sku, name: product.name },
    ipAddress: getClientIp(req),
  });

  res.status(201).json({ data: product });
});

router.get('/:id', async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.id);
  res.json({ data: product });
});

router.put('/:id', requireManagerOrAdmin, validate(updateProductSchema), async (req: Request, res: Response) => {
  const product = await productService.updateProduct(
    req.params.id,
    req.body as Parameters<typeof productService.updateProduct>[1]
  );

  await createAuditLog({
    userId: req.user!.userId,
    action: 'UPDATE',
    entity: 'Product',
    entityId: product.id,
    details: { sku: product.sku, updatedFields: Object.keys(req.body as object) },
    ipAddress: getClientIp(req),
  });

  res.json({ data: product });
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const result = await productService.deleteProduct(req.params.id);

  await createAuditLog({
    userId: req.user!.userId,
    action: result.softDeleted ? 'DEACTIVATE' : 'DELETE',
    entity: 'Product',
    entityId: req.params.id,
    details: { softDeleted: result.softDeleted },
    ipAddress: getClientIp(req),
  });

  if (result.softDeleted) {
    res.json({
      data: {
        message:
          'Product has existing damage reports and has been deactivated rather than deleted.',
        softDeleted: true,
      },
    });
  } else {
    res.json({ data: { message: 'Product deleted successfully', softDeleted: false } });
  }
});

export default router;
