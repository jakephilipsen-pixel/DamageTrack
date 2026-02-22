import { Router, Request, Response } from 'express';
import { requireManagerOrAdmin } from '../middleware/roleCheck';
import prisma from '../config/database';
import { startOfDay, startOfWeek, startOfMonth, subMonths, format } from 'date-fns';
import { DamageStatus } from '@prisma/client';

const router = Router();

router.use(requireManagerOrAdmin);

router.get('/dashboard-stats', async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const [
    totalToday,
    totalThisWeek,
    totalThisMonth,
    byStatus,
    byCause,
    byCustomer,
    recentDamages,
    openLossAggregate,
  ] = await Promise.all([
    prisma.damageReport.count({ where: { dateReported: { gte: todayStart } } }),
    prisma.damageReport.count({ where: { dateReported: { gte: weekStart } } }),
    prisma.damageReport.count({ where: { dateReported: { gte: monthStart } } }),

    prisma.damageReport.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { estimatedLoss: true },
    }),

    prisma.damageReport.groupBy({
      by: ['cause'],
      _count: { _all: true },
      _sum: { estimatedLoss: true },
      orderBy: { _count: { cause: 'desc' } },
      take: 10,
    }),

    prisma.damageReport.groupBy({
      by: ['customerId'],
      _count: { _all: true },
      _sum: { estimatedLoss: true },
      orderBy: { _count: { customerId: 'desc' } },
      take: 10,
    }),

    prisma.damageReport.findMany({
      orderBy: { dateReported: 'desc' },
      take: 10,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, sku: true, name: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),

    prisma.damageReport.aggregate({
      where: {
        status: {
          notIn: [DamageStatus.RESOLVED, DamageStatus.CLOSED, DamageStatus.WRITTEN_OFF],
        },
      },
      _sum: { estimatedLoss: true },
      _count: { _all: true },
    }),
  ]);

  const customerIds = byCustomer.map((c) => c.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, code: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const byCustomerWithNames = byCustomer.map((c) => ({
    ...c,
    customer: customerMap.get(c.customerId) || null,
    totalLoss: c._sum.estimatedLoss !== null ? Number(c._sum.estimatedLoss) : null,
    count: c._count._all,
  }));

  res.json({
    data: {
      counts: {
        today: totalToday,
        thisWeek: totalThisWeek,
        thisMonth: totalThisMonth,
      },
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count._all,
        totalLoss: s._sum.estimatedLoss !== null ? Number(s._sum.estimatedLoss) : null,
      })),
      byCause: byCause.map((c) => ({
        cause: c.cause,
        count: c._count._all,
        totalLoss: c._sum.estimatedLoss !== null ? Number(c._sum.estimatedLoss) : null,
      })),
      byCustomer: byCustomerWithNames,
      recentDamages: recentDamages.map((r) => ({
        ...r,
        estimatedLoss: r.estimatedLoss !== null ? Number(r.estimatedLoss) : null,
      })),
      openReports: {
        count: openLossAggregate._count._all,
        totalEstimatedLoss:
          openLossAggregate._sum.estimatedLoss !== null
            ? Number(openLossAggregate._sum.estimatedLoss)
            : 0,
      },
    },
  });
});

router.get('/by-customer', async (_req: Request, res: Response) => {
  const grouped = await prisma.damageReport.groupBy({
    by: ['customerId'],
    _count: { _all: true },
    _sum: { estimatedLoss: true },
    orderBy: { _count: { customerId: 'desc' } },
  });

  const customerIds = grouped.map((g) => g.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, code: true, isActive: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const result = grouped.map((g) => ({
    customerId: g.customerId,
    customer: customerMap.get(g.customerId) || null,
    count: g._count._all,
    totalLoss: g._sum.estimatedLoss !== null ? Number(g._sum.estimatedLoss) : null,
  }));

  res.json({ data: result });
});

router.get('/by-cause', async (_req: Request, res: Response) => {
  const grouped = await prisma.damageReport.groupBy({
    by: ['cause'],
    _count: { _all: true },
    _sum: { estimatedLoss: true },
    orderBy: { _count: { cause: 'desc' } },
  });

  const result = grouped.map((g) => ({
    cause: g.cause,
    count: g._count._all,
    totalLoss: g._sum.estimatedLoss !== null ? Number(g._sum.estimatedLoss) : null,
  }));

  res.json({ data: result });
});

router.get('/by-severity', async (_req: Request, res: Response) => {
  const grouped = await prisma.damageReport.groupBy({
    by: ['severity'],
    _count: { _all: true },
    _sum: { estimatedLoss: true },
    orderBy: { _count: { severity: 'desc' } },
  });

  const result = grouped.map((g) => ({
    severity: g.severity,
    count: g._count._all,
    totalLoss: g._sum.estimatedLoss !== null ? Number(g._sum.estimatedLoss) : null,
  }));

  res.json({ data: result });
});

router.get('/by-status', async (_req: Request, res: Response) => {
  const grouped = await prisma.damageReport.groupBy({
    by: ['status'],
    _count: { _all: true },
    _sum: { estimatedLoss: true },
    orderBy: { _count: { status: 'desc' } },
  });

  const result = grouped.map((g) => ({
    status: g.status,
    count: g._count._all,
    totalLoss: g._sum.estimatedLoss !== null ? Number(g._sum.estimatedLoss) : null,
  }));

  res.json({ data: result });
});

router.get('/monthly-trend', async (_req: Request, res: Response) => {
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    months.push({
      label: format(monthDate, 'yyyy-MM'),
      start,
      end,
    });
  }

  const results = await Promise.all(
    months.map(async (m) => {
      const [count, aggregate] = await Promise.all([
        prisma.damageReport.count({
          where: { dateReported: { gte: m.start, lte: m.end } },
        }),
        prisma.damageReport.aggregate({
          where: { dateReported: { gte: m.start, lte: m.end } },
          _sum: { estimatedLoss: true },
        }),
      ]);
      return {
        month: m.label,
        count,
        totalLoss:
          aggregate._sum.estimatedLoss !== null
            ? Number(aggregate._sum.estimatedLoss)
            : 0,
      };
    })
  );

  res.json({ data: results });
});

export default router;
