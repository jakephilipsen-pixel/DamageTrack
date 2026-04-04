import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/reasons
 * Returns active reasons by default. Query: ?all=true to include inactive.
 */
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const showAll = req.query.all === "true";

    const reasons = await prisma.reason.findMany({
      where: showAll ? {} : { active: true },
      orderBy: { text: "asc" },
    });

    res.json(reasons);
  } catch (error) {
    console.error("List reasons error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/reasons
 * Body: { text }
 * Admin only
 */
router.post("/", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "Reason text is required" });
      return;
    }

    const existing = await prisma.reason.findUnique({ where: { text: text.trim() } });
    if (existing) {
      res.status(409).json({ error: "Reason already exists" });
      return;
    }

    const reason = await prisma.reason.create({
      data: { text: text.trim() },
    });

    res.status(201).json(reason);
  } catch (error) {
    console.error("Create reason error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/reasons/:id
 * Body: { text?, active? }
 * Admin only
 */
router.put("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { text, active } = req.body;

    const existing = await prisma.reason.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Reason not found" });
      return;
    }

    // Check text uniqueness if changing
    if (text && text.trim() !== existing.text) {
      const textTaken = await prisma.reason.findUnique({ where: { text: text.trim() } });
      if (textTaken) {
        res.status(409).json({ error: "Reason text already exists" });
        return;
      }
    }

    const reason = await prisma.reason.update({
      where: { id },
      data: {
        ...(text !== undefined && { text: text.trim() }),
        ...(active !== undefined && { active }),
      },
    });

    res.json(reason);
  } catch (error) {
    console.error("Update reason error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
