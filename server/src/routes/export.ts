import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/export/email/:id
 * Export a single report's data (admin only).
 * Returns the full report data ready for PDF generation / emailing.
 */
router.post("/email/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
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

    // Build export payload
    const exportData = {
      reference: report.reference,
      dateTime: report.dateTime,
      product: {
        sku: report.product.sku,
        description: report.product.description,
        customer: report.product.customer,
      },
      employee: report.employee.name,
      reason: report.reason.text,
      faultOf: report.faultOf,
      quantity: report.quantity,
      notes: report.notes,
      createdBy: report.user.username,
      photos: report.photos.map((p) => ({
        filename: p.filename,
        thumbnail: p.thumbnail,
        url: `/uploads/photos/${p.filename}`,
        thumbnailUrl: `/uploads/thumbnails/${p.thumbnail}`,
      })),
      createdAt: report.createdAt,
    };

    res.json({
      message: "Export data ready",
      report: exportData,
    });
  } catch (error) {
    console.error("Export email error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/export/bulk
 * Body: { dateFrom, dateTo, faultOf? }
 * Bulk export reports by date range (admin only).
 * Returns array of report data for PDF/CSV generation.
 */
router.post("/bulk", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, faultOf } = req.body;

    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: "dateFrom and dateTo are required" });
      return;
    }

    const where: any = {
      dateTime: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      },
    };

    if (faultOf && ["WAREHOUSE", "TRANSPORT"].includes(faultOf)) {
      where.faultOf = faultOf;
    }

    const reports = await prisma.damageReport.findMany({
      where,
      include: {
        product: true,
        employee: true,
        reason: true,
        user: { select: { id: true, username: true, role: true } },
        photos: true,
      },
      orderBy: { dateTime: "asc" },
    });

    const exportData = reports.map((report) => ({
      reference: report.reference,
      dateTime: report.dateTime,
      product: {
        sku: report.product.sku,
        description: report.product.description,
        customer: report.product.customer,
      },
      employee: report.employee.name,
      reason: report.reason.text,
      faultOf: report.faultOf,
      quantity: report.quantity,
      notes: report.notes,
      createdBy: report.user.username,
      photoCount: report.photos.length,
      photos: report.photos.map((p) => ({
        filename: p.filename,
        thumbnail: p.thumbnail,
        url: `/uploads/photos/${p.filename}`,
        thumbnailUrl: `/uploads/thumbnails/${p.thumbnail}`,
      })),
      createdAt: report.createdAt,
    }));

    // Summary stats
    const summary = {
      totalReports: reports.length,
      totalQuantity: reports.reduce((sum, r) => sum + r.quantity, 0),
      byFault: {
        warehouse: reports.filter((r) => r.faultOf === "WAREHOUSE").length,
        transport: reports.filter((r) => r.faultOf === "TRANSPORT").length,
      },
      dateRange: { from: dateFrom, to: dateTo },
    };

    res.json({
      message: "Bulk export ready",
      summary,
      reports: exportData,
    });
  } catch (error) {
    console.error("Bulk export error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
