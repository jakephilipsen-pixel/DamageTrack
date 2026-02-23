import { Router, Request, Response } from 'express';
import prisma from '../config/database';

const router = Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get in-app notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications (max 20, last 48 hours)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       damageId:
 *                         type: string
 *                       referenceNumber:
 *                         type: string
 *                       fromStatus:
 *                         type: string
 *                       toStatus:
 *                         type: string
 *                       changedByUser:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const histories = await prisma.statusHistory.findMany({
    where: {
      createdAt: { gte: since },
      changedBy: { not: userId },
      damageReport: {
        OR: [
          { reportedById: userId },
          { reviewedById: userId },
        ],
      },
    },
    include: {
      damageReport: {
        select: { id: true, referenceNumber: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const notifications = histories.map((h) => ({
    id: h.id,
    damageId: h.damageReport.id,
    referenceNumber: h.damageReport.referenceNumber,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    changedByUser: h.changedByUser,
    createdAt: h.createdAt,
  }));

  res.json({ data: notifications });
});

export default router;
