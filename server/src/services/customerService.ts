import { Prisma } from '@prisma/client';
import prisma from '../config/database';

export async function getCustomers(
  search: string | undefined,
  page: number,
  limit: number,
  includeInactive: boolean
) {
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { damages: true, products: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
      damages: {
        orderBy: { dateReported: 'desc' },
        take: 10,
        include: {
          product: {
            select: { id: true, sku: true, name: true },
          },
          reportedBy: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
        },
      },
      _count: {
        select: { damages: true, products: true },
      },
    },
  });

  if (!customer) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  return customer;
}

export async function createCustomer(data: {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  contactName?: string;
}) {
  const existing = await prisma.customer.findUnique({
    where: { code: data.code.toUpperCase() },
  });

  if (existing) {
    throw Object.assign(new Error(`Customer with code '${data.code}' already exists`), {
      status: 409,
    });
  }

  return prisma.customer.create({
    data: {
      name: data.name.trim(),
      code: data.code.toUpperCase().trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      contactName: data.contactName?.trim() || null,
    },
    include: {
      _count: { select: { damages: true, products: true } },
    },
  });
}

export async function updateCustomer(
  id: string,
  data: {
    name?: string;
    code?: string;
    email?: string | null;
    phone?: string | null;
    contactName?: string | null;
    isActive?: boolean;
  }
) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  if (data.code && data.code.toUpperCase() !== existing.code) {
    const codeConflict = await prisma.customer.findUnique({
      where: { code: data.code.toUpperCase() },
    });
    if (codeConflict) {
      throw Object.assign(new Error(`Customer with code '${data.code}' already exists`), {
        status: 409,
      });
    }
  }

  const updateData: Prisma.CustomerUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.code !== undefined) updateData.code = data.code.toUpperCase().trim();
  if (data.email !== undefined) updateData.email = data.email?.trim() || null;
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.contactName !== undefined) updateData.contactName = data.contactName?.trim() || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.customer.update({
    where: { id },
    data: updateData,
    include: {
      _count: { select: { damages: true, products: true } },
    },
  });
}

export async function deleteCustomer(id: string): Promise<{ deleted: boolean; softDeleted: boolean }> {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  const damageCount = await prisma.damageReport.count({ where: { customerId: id } });

  if (damageCount > 0) {
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
    return { deleted: false, softDeleted: true };
  }

  await prisma.customer.delete({ where: { id } });
  return { deleted: true, softDeleted: false };
}
