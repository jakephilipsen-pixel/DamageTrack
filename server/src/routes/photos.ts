import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { upload } from '../config/upload';
import { uploadLimiter } from '../middleware/rateLimiter';
import * as photoService from '../services/photoService';
import { createAuditLog } from '../services/auditService';
import { getClientIp } from '../utils/helpers';

const router = Router();

const updateCaptionSchema = z.object({
  caption: z.string().max(500).nullable().optional(),
});

router.post(
  '/upload/:damageId',
  uploadLimiter,
  upload.array('photos', 10),
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const photos = await photoService.uploadPhotos(req.params.damageId, files);

    await createAuditLog({
      userId: req.user!.userId,
      action: 'UPLOAD_PHOTOS',
      entity: 'DamageReport',
      entityId: req.params.damageId,
      details: { photoCount: photos.length, filenames: photos.map((p) => p.filename) },
      ipAddress: getClientIp(req),
    });

    res.status(201).json({ data: photos });
  }
);

router.delete('/:id', async (req: Request, res: Response) => {
  await photoService.deletePhoto(req.params.id);

  await createAuditLog({
    userId: req.user!.userId,
    action: 'DELETE_PHOTO',
    entity: 'DamagePhoto',
    entityId: req.params.id,
    ipAddress: getClientIp(req),
  });

  res.json({ data: { message: 'Photo deleted successfully' } });
});

router.patch('/:id/primary', async (req: Request, res: Response) => {
  const { damageReportId } = req.body as { damageReportId?: string };

  if (!damageReportId) {
    res.status(400).json({ error: 'damageReportId is required in request body' });
    return;
  }

  const result = await photoService.setPrimaryPhoto(req.params.id, damageReportId);
  res.json({ data: result });
});

router.patch('/:id/caption', validate(updateCaptionSchema), async (req: Request, res: Response) => {
  const { caption } = req.body as { caption?: string | null };
  const result = await photoService.updateCaption(req.params.id, caption ?? null);
  res.json({ data: result });
});

export default router;
