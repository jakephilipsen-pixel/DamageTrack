import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import sharp from 'sharp';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleCheck';
import { createAuditLog } from '../services/auditService';
import { getClientIp } from '../utils/helpers';
import logger from '../utils/logger';

const router = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const BRANDING_DIR = path.join(UPLOAD_DIR, 'branding');

// Ensure branding directory exists
fs.mkdirSync(BRANDING_DIR, { recursive: true });

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const updateBrandingSchema = z.object({
  companyName: z.string().min(1).max(100),
  tagline: z.string().max(200).nullable().optional(),
  primaryColor: z.string().regex(hexColorRegex, 'Invalid hex colour'),
  secondaryColor: z.string().regex(hexColorRegex, 'Invalid hex colour'),
  accentColor: z.string().regex(hexColorRegex, 'Invalid hex colour'),
  pdfFooterText: z.string().max(300).nullable().optional(),
  emailFromName: z.string().max(100).nullable().optional(),
});

// Multer for logo upload
const logoStorage = multer.memoryStorage();
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPEG, SVG and WebP are allowed.'));
    }
  },
});

function getBrandingResponse(settings: any) {
  const appUrl = process.env.APP_URL || 'http://localhost:5174';
  return {
    companyName: settings.companyName,
    tagline: settings.tagline,
    logoUrl: settings.logoPath ? `${appUrl}/api/branding/logo` : null,
    logoSmallUrl: settings.logoPath ? `${appUrl}/api/branding/logo?size=small` : null,
    logoMediumUrl: settings.logoPath ? `${appUrl}/api/branding/logo?size=medium` : null,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
    pdfFooterText: settings.pdfFooterText,
    emailFromName: settings.emailFromName,
  };
}

// GET /api/branding — Public (no auth)
router.get('/', async (_req: Request, res: Response) => {
  let settings = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });

  if (!settings) {
    settings = await prisma.brandingSettings.create({
      data: {
        id: 'default',
        companyName: 'DamageTrack',
        tagline: 'Warehouse Damage Management',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e293b',
        accentColor: '#10b981',
      },
    });
  }

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ data: getBrandingResponse(settings) });
});

// GET /api/branding/logo — Public (no auth)
router.get('/logo', async (req: Request, res: Response) => {
  const settings = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });

  if (!settings?.logoPath) {
    res.status(404).json({ error: 'No logo uploaded' });
    return;
  }

  const size = req.query.size as string | undefined;
  let filePath: string;

  if (size === 'small') {
    filePath = path.resolve(BRANDING_DIR, 'logo-small.png');
  } else if (size === 'medium') {
    filePath = path.resolve(BRANDING_DIR, 'logo-medium.png');
  } else if (size === 'pdf') {
    filePath = path.resolve(BRANDING_DIR, 'logo-pdf.png');
  } else {
    filePath = path.resolve(UPLOAD_DIR, settings.logoPath);
  }

  if (!fs.existsSync(filePath)) {
    // Fall back to original
    filePath = path.resolve(UPLOAD_DIR, settings.logoPath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Logo file not found' });
      return;
    }
  }

  const contentType = size ? 'image/png' : (settings.logoMimeType || 'image/png');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(filePath);
});

// PUT /api/branding — ADMIN only
router.put('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const parsed = updateBrandingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { companyName, tagline, primaryColor, secondaryColor, accentColor, pdfFooterText, emailFromName } = parsed.data;

  const settings = await prisma.brandingSettings.upsert({
    where: { id: 'default' },
    update: {
      companyName,
      tagline: tagline ?? null,
      primaryColor,
      secondaryColor,
      accentColor,
      pdfFooterText: pdfFooterText ?? null,
      emailFromName: emailFromName ?? null,
      updatedBy: req.user!.userId,
    },
    create: {
      id: 'default',
      companyName,
      tagline: tagline ?? null,
      primaryColor,
      secondaryColor,
      accentColor,
      pdfFooterText: pdfFooterText ?? null,
      emailFromName: emailFromName ?? null,
      updatedBy: req.user!.userId,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    action: 'UPDATE',
    entity: 'BrandingSettings',
    entityId: 'default',
    details: { companyName, primaryColor, secondaryColor, accentColor },
    ipAddress: getClientIp(req),
  });

  res.json({ data: getBrandingResponse(settings) });
});

// POST /api/branding/logo — ADMIN only
router.post('/logo', authenticate, requireAdmin, (req: Request, res: Response) => {
  logoUpload.single('logo')(req, res, async (err: any) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? (err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Maximum size is 2MB.' : err.message)
        : err.message;
      res.status(400).json({ error: message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    try {
      const file = req.file;
      const isSvg = file.mimetype === 'image/svg+xml';

      // Validate dimensions for non-SVG
      if (!isSvg) {
        const metadata = await sharp(file.buffer).metadata();
        if (metadata.width && metadata.height) {
          if (metadata.width < 64 || metadata.height < 64) {
            res.status(400).json({ error: 'Image must be at least 64x64 pixels.' });
            return;
          }
          if (metadata.width > 2000 || metadata.height > 2000) {
            res.status(400).json({ error: 'Image must not exceed 2000x2000 pixels.' });
            return;
          }
        }
      }

      fs.mkdirSync(BRANDING_DIR, { recursive: true });

      // Determine extension
      const extMap: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/svg+xml': '.svg',
        'image/webp': '.webp',
      };
      const ext = extMap[file.mimetype] || '.png';
      const logoFilename = `logo${ext}`;
      const logoFullPath = path.join(BRANDING_DIR, logoFilename);

      // Remove old logo files
      const oldFiles = fs.readdirSync(BRANDING_DIR);
      for (const f of oldFiles) {
        fs.unlinkSync(path.join(BRANDING_DIR, f));
      }

      // Save original
      fs.writeFileSync(logoFullPath, file.buffer);

      // Generate resized versions (skip for SVG — convert SVG to PNG first)
      const sourceBuffer = isSvg
        ? await sharp(file.buffer).png().toBuffer()
        : file.buffer;

      // logo-small: 48x48 for favicon
      await sharp(sourceBuffer)
        .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(BRANDING_DIR, 'logo-small.png'));

      // logo-medium: max 200x80 for sidebar
      await sharp(sourceBuffer)
        .resize(200, 80, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toFile(path.join(BRANDING_DIR, 'logo-medium.png'));

      // logo-pdf: max 300x120 for PDF header
      await sharp(sourceBuffer)
        .resize(300, 120, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toFile(path.join(BRANDING_DIR, 'logo-pdf.png'));

      // Update DB
      const settings = await prisma.brandingSettings.upsert({
        where: { id: 'default' },
        update: {
          logoPath: `branding/${logoFilename}`,
          logoMimeType: file.mimetype,
          updatedBy: req.user!.userId,
        },
        create: {
          id: 'default',
          logoPath: `branding/${logoFilename}`,
          logoMimeType: file.mimetype,
          updatedBy: req.user!.userId,
        },
      });

      await createAuditLog({
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'BrandingSettings',
        entityId: 'default',
        details: { action: 'logo_upload', filename: logoFilename, mimeType: file.mimetype },
        ipAddress: getClientIp(req),
      });

      res.json({ data: getBrandingResponse(settings) });
    } catch (error) {
      logger.error('Logo upload failed', { error });
      res.status(500).json({ error: 'Failed to process logo' });
    }
  });
});

// DELETE /api/branding/logo — ADMIN only
router.delete('/logo', authenticate, requireAdmin, async (req: Request, res: Response) => {
  // Delete all files in branding directory
  if (fs.existsSync(BRANDING_DIR)) {
    const files = fs.readdirSync(BRANDING_DIR);
    for (const f of files) {
      fs.unlinkSync(path.join(BRANDING_DIR, f));
    }
  }

  const settings = await prisma.brandingSettings.update({
    where: { id: 'default' },
    data: {
      logoPath: null,
      logoMimeType: null,
      faviconPath: null,
      updatedBy: req.user!.userId,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    action: 'UPDATE',
    entity: 'BrandingSettings',
    entityId: 'default',
    details: { action: 'logo_delete' },
    ipAddress: getClientIp(req),
  });

  res.json({ data: getBrandingResponse(settings) });
});

export default router;
