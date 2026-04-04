import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/employees
 * Returns active employees by default. Query: ?all=true to include inactive.
 */
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const showAll = req.query.all === "true";

    const employees = await prisma.employee.findMany({
      where: showAll ? {} : { active: true },
      orderBy: { name: "asc" },
    });

    res.json(employees);
  } catch (error) {
    console.error("List employees error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/employees
 * Body: { name }
 * Admin only
 */
router.post("/", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const employee = await prisma.employee.create({
      data: { name: name.trim() },
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error("Create employee error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/employees/:id
 * Body: { name?, active? }
 * Admin only
 */
router.put("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, active } = req.body;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(active !== undefined && { active }),
      },
    });

    res.json(employee);
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
