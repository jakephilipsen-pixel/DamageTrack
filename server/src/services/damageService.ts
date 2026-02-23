import { DamageStatus, DamageSeverity, DamageCause, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { generateReferenceNumber } from '../utils/helpers';
import { DamageFilters } from '../types';

const VALID_TRANSITIONS: Record<DamageStatus, DamageStatus[]> = {
  DRAFT: ['REPORTED'],
  REPORTED: ['UNDER_REVIEW', 'CLOSED'],
  UNDER_REVIEW: ['CUSTOMER_NOTIFIED', 'CLAIM_FILED', 'RESOLVED', 'CLOSED'],
  CUSTOMER_NOTIFIED: ['CLAIM_FILED', 'RESOLVED', 'CLOSED'],
  CLAIM_FILED: ['RESOLVED', 'WRITTEN_OFF', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  WRITTEN_OFF: ['CLOSED'],
  CLOSED: [],
};

const damageIncludeFull = {
  customer: true,
  product: {
    include: { customer: true },
  },
  reportedBy: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  photos: {
    orderBy: { isPrimary: 'desc' as const },
  },
  comments: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
  },
  _count: {
    select: { photos: true, comments: true },
  },
};

const damageIncludeList = {
  customer: {
    select: { id: true, name: true, code: true },
  },
  product: {
    select: { id: true, sku: true, name: true },
  },
  reportedBy: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
  _count: {
    select: { photos: true, comments: true },
  },
};

function buildDamageWhere(filters: DamageFilters): Prisma.DamageReportWhereInput {
  const where: Prisma.DamageReportWhereInput = {};

  if (filters.search) {
    const search = filters.search.trim();
    where.OR = [
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { locationInWarehouse: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { sku: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.severity) {
    where.severity = filters.severity;
  }

  if (filters.cause) {
    where.cause = filters.cause;
  }

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters.reportedById) {
    where.reportedById = filters.reportedById;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.dateOfDamage = {};
    if (filters.dateFrom) {
      (where.dateOfDamage as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      (where.dateOfDamage as Prisma.DateTimeFilter).lte = new Date(filters.dateTo);
    }
  }

  return where;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeDamageReport(report: any): any {
  const result = { ...report } as Record<string, unknown>;
  if (result.estimatedLoss !== undefined && result.estimatedLoss !== null) {
    result.estimatedLoss = Number(result.estimatedLoss);
  }
  if (result.product && typeof result.product === 'object') {
    const product = { ...(result.product as Record<string, unknown>) };
    if (product.unitValue !== undefined && product.unitValue !== null) {
      product.unitValue = Number(product.unitValue);
    }
    result.product = product;
  }
  return result;
}

export async function getDamages(
  filters: DamageFilters,
  pagination: { page: number; limit: number; skip: number }
) {
  const where = buildDamageWhere(filters);

  const [reports, total] = await Promise.all([
    prisma.damageReport.findMany({
      where,
      include: damageIncludeList,
      orderBy: { dateReported: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.damageReport.count({ where }),
  ]);

  return {
    data: reports.map(serializeDamageReport),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

export async function getDamageById(id: string) {
  const report = await prisma.damageReport.findUnique({
    where: { id },
    include: damageIncludeFull,
  });

  if (!report) {
    throw Object.assign(new Error('Damage report not found'), { status: 404 });
  }

  return serializeDamageReport(report);
}

export async function createDamage(
  data: {
    customerId: string;
    productId: string;
    quantity: number;
    severity: DamageSeverity;
    cause: DamageCause;
    causeOther?: string;
    description: string;
    locationInWarehouse?: string;
    estimatedLoss?: number;
    dateOfDamage: string;
    status?: DamageStatus;
  },
  userId: string
) {
  const referenceNumber = await generateReferenceNumber();

  const report = await prisma.damageReport.create({
    data: {
      referenceNumber,
      customerId: data.customerId,
      productId: data.productId,
      quantity: data.quantity,
      severity: data.severity,
      cause: data.cause,
      causeOther: data.causeOther ?? null,
      description: data.description,
      locationInWarehouse: data.locationInWarehouse ?? null,
      estimatedLoss: data.estimatedLoss !== undefined ? data.estimatedLoss : null,
      dateOfDamage: new Date(data.dateOfDamage),
      status: data.status || DamageStatus.DRAFT,
      reportedById: userId,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: data.status || DamageStatus.DRAFT,
          changedBy: userId,
          note: 'Damage report created',
        },
      },
    },
    include: damageIncludeFull,
  });

  return serializeDamageReport(report);
}

export async function updateDamage(
  id: string,
  data: {
    customerId?: string;
    productId?: string;
    quantity?: number;
    severity?: DamageSeverity;
    cause?: DamageCause;
    causeOther?: string | null;
    description?: string;
    locationInWarehouse?: string | null;
    estimatedLoss?: number | null;
    dateOfDamage?: string;
  },
  _userId: string
) {
  const existing = await prisma.damageReport.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Damage report not found'), { status: 404 });
  }

  const updateData: Prisma.DamageReportUpdateInput = {};

  if (data.customerId !== undefined) updateData.customer = { connect: { id: data.customerId } };
  if (data.productId !== undefined) updateData.product = { connect: { id: data.productId } };
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.severity !== undefined) updateData.severity = data.severity;
  if (data.cause !== undefined) updateData.cause = data.cause;
  if (data.causeOther !== undefined) updateData.causeOther = data.causeOther;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.locationInWarehouse !== undefined) updateData.locationInWarehouse = data.locationInWarehouse;
  if (data.estimatedLoss !== undefined) updateData.estimatedLoss = data.estimatedLoss;
  if (data.dateOfDamage !== undefined) updateData.dateOfDamage = new Date(data.dateOfDamage);

  const report = await prisma.damageReport.update({
    where: { id },
    data: updateData,
    include: damageIncludeFull,
  });

  return serializeDamageReport(report);
}

export async function deleteDamage(id: string): Promise<void> {
  const existing = await prisma.damageReport.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Damage report not found'), { status: 404 });
  }

  await prisma.damageReport.delete({ where: { id } });
}

export async function changeStatus(
  id: string,
  newStatus: DamageStatus,
  userId: string,
  note?: string
) {
  const existing = await prisma.damageReport.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Damage report not found'), { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[existing.status];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Invalid status transition from ${existing.status} to ${newStatus}`),
      { status: 400 }
    );
  }

  const updateData: Prisma.DamageReportUpdateInput = {
    status: newStatus,
  };

  if (newStatus === DamageStatus.RESOLVED || newStatus === DamageStatus.CLOSED || newStatus === DamageStatus.WRITTEN_OFF) {
    updateData.dateResolved = new Date();
    updateData.reviewedBy = { connect: { id: userId } };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });

  const report = await prisma.damageReport.update({
    where: { id },
    data: {
      ...updateData,
      statusHistory: {
        create: {
          fromStatus: existing.status,
          toStatus: newStatus,
          changedBy: userId,
          changedByUser: user ? `${user.firstName} ${user.lastName}` : undefined,
          note: note ?? null,
        },
      },
    },
    include: damageIncludeFull,
  });

  return serializeDamageReport(report);
}

export async function addComment(
  damageId: string,
  userId: string,
  content: string
) {
  const damage = await prisma.damageReport.findUnique({ where: { id: damageId } });
  if (!damage) {
    throw Object.assign(new Error('Damage report not found'), { status: 404 });
  }

  const comment = await prisma.damageComment.create({
    data: {
      damageReportId: damageId,
      userId,
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return comment;
}

export async function getComments(damageId: string) {
  const damage = await prisma.damageReport.findUnique({ where: { id: damageId } });
  if (!damage) {
    throw Object.assign(new Error('Damage report not found'), { status: 404 });
  }

  return prisma.damageComment.findMany({
    where: { damageReportId: damageId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}
