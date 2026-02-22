import { Prisma } from '@prisma/client';
import prisma from '../config/database';

function serializeProduct<T extends { unitValue?: unknown }>(product: T): T {
  const result = { ...product } as Record<string, unknown>;
  if (result.unitValue !== undefined && result.unitValue !== null) {
    result.unitValue = Number(result.unitValue);
  }
  return result as T;
}

export async function getProducts(
  search: string | undefined,
  customerId: string | undefined,
  page: number,
  limit: number
) {
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (customerId) {
    where.customerId = customerId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, code: true },
        },
        _count: { select: { damages: true } },
      },
      orderBy: [{ customer: { name: 'asc' } }, { name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map(serializeProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      customer: true,
      damages: {
        orderBy: { dateReported: 'desc' },
        take: 10,
        include: {
          reportedBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
        },
      },
      _count: { select: { damages: true } },
    },
  });

  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  return serializeProduct(product);
}

export async function createProduct(data: {
  sku: string;
  name: string;
  barcode?: string;
  description?: string;
  unitValue?: number;
  customerId: string;
}) {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  const existing = await prisma.product.findUnique({
    where: { sku_customerId: { sku: data.sku, customerId: data.customerId } },
  });

  if (existing) {
    throw Object.assign(
      new Error(`Product with SKU '${data.sku}' already exists for this customer`),
      { status: 409 }
    );
  }

  const product = await prisma.product.create({
    data: {
      sku: data.sku.trim().toUpperCase(),
      name: data.name.trim(),
      barcode: data.barcode?.trim() || null,
      description: data.description?.trim() || null,
      unitValue: data.unitValue !== undefined ? data.unitValue : null,
      customerId: data.customerId,
    },
    include: {
      customer: {
        select: { id: true, name: true, code: true },
      },
      _count: { select: { damages: true } },
    },
  });

  return serializeProduct(product);
}

export async function updateProduct(
  id: string,
  data: {
    sku?: string;
    name?: string;
    barcode?: string | null;
    description?: string | null;
    unitValue?: number | null;
    isActive?: boolean;
  }
) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  if (data.sku && data.sku !== existing.sku) {
    const skuConflict = await prisma.product.findUnique({
      where: {
        sku_customerId: { sku: data.sku.toUpperCase(), customerId: existing.customerId },
      },
    });
    if (skuConflict && skuConflict.id !== id) {
      throw Object.assign(
        new Error(`Product with SKU '${data.sku}' already exists for this customer`),
        { status: 409 }
      );
    }
  }

  const updateData: Prisma.ProductUpdateInput = {};
  if (data.sku !== undefined) updateData.sku = data.sku.trim().toUpperCase();
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.barcode !== undefined) updateData.barcode = data.barcode?.trim() || null;
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.unitValue !== undefined) updateData.unitValue = data.unitValue;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      customer: {
        select: { id: true, name: true, code: true },
      },
      _count: { select: { damages: true } },
    },
  });

  return serializeProduct(product);
}

export async function deleteProduct(
  id: string
): Promise<{ deleted: boolean; softDeleted: boolean }> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const damageCount = await prisma.damageReport.count({ where: { productId: id } });

  if (damageCount > 0) {
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return { deleted: false, softDeleted: true };
  }

  await prisma.product.delete({ where: { id } });
  return { deleted: true, softDeleted: false };
}
