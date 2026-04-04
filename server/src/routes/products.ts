import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, requireAdmin } from "../middleware/auth";
import multer from "multer";
import { parse } from "csv-parse";
import { Readable } from "stream";

const router = Router();
const prisma = new PrismaClient();

// Multer config for CSV upload (memory storage)
const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/**
 * GET /api/products
 * Query: ?search= (filters by SKU, case-insensitive)
 *        ?active= (true/false, defaults to all)
 */
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, active } = req.query;

    const where: any = {};

    if (search && typeof search === "string") {
      where.sku = { contains: search, mode: "insensitive" };
    }

    if (active !== undefined) {
      where.active = active === "true";
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { sku: "asc" },
    });

    res.json(products);
  } catch (error) {
    console.error("List products error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/products
 * Body: { sku, description, customer }
 * Admin only
 */
router.post("/", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sku, description, customer } = req.body;

    if (!sku || !description || !customer) {
      res.status(400).json({ error: "sku, description, and customer are required" });
      return;
    }

    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      res.status(409).json({ error: `Product with SKU '${sku}' already exists` });
      return;
    }

    const product = await prisma.product.create({
      data: { sku, description, customer },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/products/:id
 * Body: { sku?, description?, customer?, active? }
 * Admin only
 */
router.put("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { sku, description, customer, active } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Check SKU uniqueness if changing
    if (sku && sku !== existing.sku) {
      const skuTaken = await prisma.product.findUnique({ where: { sku } });
      if (skuTaken) {
        res.status(409).json({ error: `SKU '${sku}' is already in use` });
        return;
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(sku !== undefined && { sku }),
        ...(description !== undefined && { description }),
        ...(customer !== undefined && { customer }),
        ...(active !== undefined && { active }),
      },
    });

    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/products/import-csv
 * Multipart form with CSV file. Columns: sku, description, customer
 * Upserts by SKU. Admin only.
 */
router.post(
  "/import-csv",
  requireAdmin,
  csvUpload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "CSV file is required" });
        return;
      }

      const records: Array<{ sku: string; description: string; customer: string }> = [];
      const errors: string[] = [];

      const parser = Readable.from(req.file.buffer).pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      );

      let lineNum = 1;
      for await (const record of parser) {
        lineNum++;
        const { sku, description, customer } = record;

        if (!sku || !description || !customer) {
          errors.push(`Row ${lineNum}: missing required field(s)`);
          continue;
        }

        records.push({ sku: sku.trim(), description: description.trim(), customer: customer.trim() });
      }

      let created = 0;
      let updated = 0;

      for (const record of records) {
        const existing = await prisma.product.findUnique({ where: { sku: record.sku } });
        if (existing) {
          await prisma.product.update({
            where: { sku: record.sku },
            data: { description: record.description, customer: record.customer },
          });
          updated++;
        } else {
          await prisma.product.create({ data: record });
          created++;
        }
      }

      res.json({
        message: "CSV import complete",
        created,
        updated,
        errors: errors.length > 0 ? errors : undefined,
        total: records.length,
      });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ error: "Failed to process CSV file" });
    }
  }
);

export default router;
