import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import logger from '../utils/logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

function resolveFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(process.cwd(), filePath);
}

function getPublicPath(absolutePath: string): string {
  const uploadsAbsolute = path.resolve(process.cwd(), UPLOAD_DIR);
  return absolutePath.replace(uploadsAbsolute, '/uploads').replace(/\\/g, '/');
}

async function createThumbnail(
  sourcePath: string,
  destPath: string
): Promise<void> {
  await sharp(sourcePath)
    .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(destPath);
}

export async function uploadPhotos(
  damageReportId: string,
  files: Express.Multer.File[]
): Promise<{ id: string; filename: string; originalName: string; path: string; thumbnailPath: string | null; isPrimary: boolean; caption: string | null; createdAt: Date }[]> {
  const damage = await prisma.damageReport.findUnique({
    where: { id: damageReportId },
    include: { _count: { select: { photos: true } } },
  });

  if (!damage) {
    for (const file of files) {
      const resolved = resolveFilePath(file.path);
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
    }
    throw Object.assign(new Error('Damage report not found'), { status: 404 });
  }

  const existingCount = damage._count.photos;
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const absoluteFilePath = resolveFilePath(file.path);
    const fileDir = path.dirname(absoluteFilePath);
    const thumbFilename = `thumb_${file.filename}`;
    const thumbPath = path.join(fileDir, thumbFilename);

    try {
      await createThumbnail(absoluteFilePath, thumbPath);
    } catch (err) {
      logger.error('Failed to create thumbnail', { error: err, file: file.filename });
    }

    const isPrimary = existingCount === 0 && i === 0;

    const publicFilePath = getPublicPath(absoluteFilePath);
    const publicThumbPath = fs.existsSync(thumbPath) ? getPublicPath(thumbPath) : null;

    const photo = await prisma.damagePhoto.create({
      data: {
        damageReportId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: publicFilePath,
        thumbnailPath: publicThumbPath,
        isPrimary,
        caption: null,
      },
    });

    results.push(photo);
  }

  return results;
}

export async function deletePhoto(id: string): Promise<void> {
  const photo = await prisma.damagePhoto.findUnique({ where: { id } });
  if (!photo) {
    throw Object.assign(new Error('Photo not found'), { status: 404 });
  }

  await prisma.damagePhoto.delete({ where: { id } });

  const absoluteFilePath = resolveFilePath(
    path.join(process.cwd(), photo.path.replace('/uploads', UPLOAD_DIR))
  );

  const uploadsAbsolute = path.resolve(process.cwd(), UPLOAD_DIR);
  const absoluteFile = path.join(uploadsAbsolute, photo.path.replace('/uploads/', ''));
  const absoluteThumb = photo.thumbnailPath
    ? path.join(uploadsAbsolute, photo.thumbnailPath.replace('/uploads/', ''))
    : null;

  try {
    if (fs.existsSync(absoluteFile)) fs.unlinkSync(absoluteFile);
  } catch (err) {
    logger.warn('Failed to delete photo file', { error: err, path: absoluteFilePath });
  }

  if (absoluteThumb) {
    try {
      if (fs.existsSync(absoluteThumb)) fs.unlinkSync(absoluteThumb);
    } catch (err) {
      logger.warn('Failed to delete thumbnail file', { error: err, path: absoluteThumb });
    }
  }

  if (photo.isPrimary) {
    const nextPhoto = await prisma.damagePhoto.findFirst({
      where: { damageReportId: photo.damageReportId },
      orderBy: { createdAt: 'asc' },
    });
    if (nextPhoto) {
      await prisma.damagePhoto.update({
        where: { id: nextPhoto.id },
        data: { isPrimary: true },
      });
    }
  }
}

export async function setPrimaryPhoto(
  photoId: string,
  damageReportId: string
): Promise<{ id: string; isPrimary: boolean }> {
  const photo = await prisma.damagePhoto.findFirst({
    where: { id: photoId, damageReportId },
  });

  if (!photo) {
    throw Object.assign(new Error('Photo not found for this damage report'), { status: 404 });
  }

  await prisma.damagePhoto.updateMany({
    where: { damageReportId },
    data: { isPrimary: false },
  });

  const updated = await prisma.damagePhoto.update({
    where: { id: photoId },
    data: { isPrimary: true },
  });

  return { id: updated.id, isPrimary: updated.isPrimary };
}

export async function updateCaption(
  photoId: string,
  caption: string | null
): Promise<{ id: string; caption: string | null }> {
  const photo = await prisma.damagePhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    throw Object.assign(new Error('Photo not found'), { status: 404 });
  }

  const updated = await prisma.damagePhoto.update({
    where: { id: photoId },
    data: { caption: caption?.trim() || null },
  });

  return { id: updated.id, caption: updated.caption };
}
