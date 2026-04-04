import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, requireAdmin } from "../middleware/auth";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { generateReference } from "../utils/reference";

const router = Router();
const prisma = new PrismaClient();

// Upload directories
const PHOTOS_DIR = path.resolve(__dirname, "../../uploads/photos");
const THUMBNAILS_DIR = path.resolve(__dirname, "../../uploads/thumbnails");

// Multer disk storage for photos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PHOTOS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const photoUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Use JPEG, PNG, or WebP.`));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 10,
  },
});

/**
 * GET /api/reports
 * Query: ?dateFrom, ?dateTo, ?faultOf, ?page, ?limit
 * Admin sees all. Others see only their own reports.
 */
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based filtering
    if (req.session.role !== "ADMIN") {
      where.userId = req.session.userId;
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      where.dateTime = {};
      if (req.query.dateFrom) {
        where.dateTime.gte = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        where.dateTime.lte = new Date(req.query.dateTo as string);
      }
    }

    // Fault filter
    if (req.query.faultOf && ["WAREHOUSE", "TRANSPORT"].includes(req.query.faultOf as string)) {
      where.faultOf = req.query.faultOf;
    }

    const [reports, total] = await Promise.all([
      prisma.damageReport.findMany({
        where,
        include: {
          product: true,
          employee: true,
          reason: true,
          user: { select: { id: true, username: true, role: true } },
          photos: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.damageReport.count({ where }),
    ]);

    res.json({
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List reports error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/reports/:id
 * Single report with photos. Admin sees any, others only their own.
 */
router.get("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const report = await prisma.damageReport.findUnique({
      where: { id },
      include: {
        product: true,
        employee: true,
        reason: true,
        user: { select: { id: true, username: true, role: true } },
        photos: true,
      },
    });

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    // Non-admin can only see their own
    if (req.session.role !== "ADMIN" && report.userId !== req.session.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json(report);
  } catch (error) {
    console.error("Get report error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/reports
 * Multipart form: productId, employeeId, reasonId, faultOf, quantity?, notes?, dateTime, photos[]
 */
router.post(
  "/",
  requireAuth,
  photoUpload.array("photos", 10),
  async (req: Request, res: Response): Promise<void> => {
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];

    try {
      const { productId, employeeId, reasonId, faultOf, quantity, notes, dateTime } = req.body;

      // Validation
      if (!productId || !employeeId || !reasonId || !faultOf || !dateTime) {
        res.status(400).json({
          error: "productId, employeeId, reasonId, faultOf, and dateTime are required",
        });
        // Clean up uploaded files on validation failure
        for (const f of uploadedFiles) {
          fs.unlink(f.path, () => {});
        }
        return;
      }

      if (!["WAREHOUSE", "TRANSPORT"].includes(faultOf)) {
        res.status(400).json({ error: "faultOf must be WAREHOUSE or TRANSPORT" });
        for (const f of uploadedFiles) {
          fs.unlink(f.path, () => {});
        }
        return;
      }

      // Verify foreign keys exist
      const [product, employee, reason] = await Promise.all([
        prisma.product.findUnique({ where: { id: productId } }),
        prisma.employee.findUnique({ where: { id: employeeId } }),
        prisma.reason.findUnique({ where: { id: reasonId } }),
      ]);

      if (!product) {
        res.status(400).json({ error: "Product not found" });
        for (const f of uploadedFiles) {
          fs.unlink(f.path, () => {});
        }
        return;
      }
      if (!employee) {
        res.status(400).json({ error: "Employee not found" });
        for (const f of uploadedFiles) {
          fs.unlink(f.path, () => {});
        }
        return;
      }
      if (!reason) {
        res.status(400).json({ error: "Reason not found" });
        for (const f of uploadedFiles) {
          fs.unlink(f.path, () => {});
        }
        return;
      }

      // Generate reference number
      const reference = await generateReference(prisma, new Date(dateTime));

      // Generate thumbnails
      const photoData: Array<{ filename: string; thumbnail: string }> = [];
      for (const file of uploadedFiles) {
        const thumbFilename = `thumb_${file.filename}`;
        const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);

        await sharp(file.path).resize(300, 300, { fit: "cover" }).jpeg({ quality: 80 }).toFile(thumbPath);

        photoData.push({
          filename: file.filename,
          thumbnail: thumbFilename,
        });
      }

      // Create report with photos in a transaction
      const report = await prisma.damageReport.create({
        data: {
          reference,
          productId,
          employeeId,
          reasonId,
          faultOf,
          quantity: quantity ? parseInt(quantity, 10) : 1,
          notes: notes || null,
          dateTime: new Date(dateTime),
          userId: req.session.userId!,
          photos: {
            create: photoData,
          },
        },
        include: {
          product: true,
          employee: true,
          reason: true,
          user: { select: { id: true, username: true, role: true } },
          photos: true,
        },
      });

      res.status(201).json(report);
    } catch (error) {
      // Clean up uploaded files on error
      for (const f of uploadedFiles) {
        fs.unlink(f.path, () => {});
      }
      console.error("Create report error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * DELETE /api/reports/:id
 * Admin only. Deletes report and associated photos from disk.
 */
router.delete("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const report = await prisma.damageReport.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    // Delete photo files from disk
    for (const photo of report.photos) {
      const photoPath = path.join(PHOTOS_DIR, photo.filename);
      const thumbPath = path.join(THUMBNAILS_DIR, photo.thumbnail);
      fs.unlink(photoPath, () => {});
      fs.unlink(thumbPath, () => {});
    }

    // Delete report (cascades to photos via Prisma)
    await prisma.damageReport.delete({ where: { id } });

    res.json({ message: "Report deleted" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
