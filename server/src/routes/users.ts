import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role, Prisma } from '@prisma/client';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/roleCheck';
import * as authService from '../services/authService';
import { createAuditLog } from '../services/auditService';
import { parsePaginationParams, getClientIp } from '../utils/helpers';
import prisma from '../config/database';

const router = Router();
const BCRYPT_ROUNDS = 12;

router.use(requireAdmin);

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.nativeEnum(Role).default(Role.WAREHOUSE_USER),
  mustChangePassword: z.boolean().default(true),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(Role).optional(),
  mustChangePassword: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

router.get('/', async (req: Request, res: Response) => {
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);
  const search = req.query.search as string | undefined;
  const role = req.query.role as Role | undefined;
  const includeInactive = req.query.includeInactive === 'true';

  const where: Prisma.UserWhereInput = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { damagesReported: true },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    data: users,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  });
});

router.post('/', validate(createUserSchema), async (req: Request, res: Response) => {
  const body = req.body as {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    mustChangePassword: boolean;
  };

  const existingEmail = await prisma.user.findUnique({ where: { email: body.email } });
  if (existingEmail) {
    res.status(409).json({ error: 'A user with this email already exists' });
    return;
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: body.username.toLowerCase() },
  });
  if (existingUsername) {
    res.status(409).json({ error: 'A user with this username already exists' });
    return;
  }

  const hashedPassword = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase().trim(),
      username: body.username.toLowerCase().trim(),
      password: hashedPassword,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      role: body.role,
      mustChangePassword: body.mustChangePassword,
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    action: 'CREATE_USER',
    entity: 'User',
    entityId: user.id,
    details: { username: user.username, role: user.role },
    ipAddress: getClientIp(req),
  });

  res.status(201).json({ data: user });
});

router.put('/:id', validate(updateUserSchema), async (req: Request, res: Response) => {
  const body = req.body as {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: Role;
    mustChangePassword?: boolean;
  };

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (body.email && body.email !== existing.email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (emailConflict) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(body.email !== undefined && { email: body.email.toLowerCase().trim() }),
      ...(body.firstName !== undefined && { firstName: body.firstName.trim() }),
      ...(body.lastName !== undefined && { lastName: body.lastName.trim() }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.mustChangePassword !== undefined && { mustChangePassword: body.mustChangePassword }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    action: 'UPDATE_USER',
    entity: 'User',
    entityId: updatedUser.id,
    details: { username: updatedUser.username, updatedFields: Object.keys(body) },
    ipAddress: getClientIp(req),
  });

  res.json({ data: updatedUser });
});

router.patch('/:id/toggle-active', async (req: Request, res: Response) => {
  if (req.params.id === req.user!.userId) {
    res.status(400).json({ error: 'You cannot deactivate your own account' });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, username: true, isActive: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !existing.isActive },
    select: {
      id: true,
      username: true,
      isActive: true,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    action: updated.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    entity: 'User',
    entityId: updated.id,
    details: { username: updated.username, isActive: updated.isActive },
    ipAddress: getClientIp(req),
  });

  res.json({ data: updated });
});

router.post('/:id/reset-password', validate(resetPasswordSchema), async (req: Request, res: Response) => {
  const { newPassword } = req.body as { newPassword: string };

  await authService.resetPassword(req.params.id, newPassword);

  await createAuditLog({
    userId: req.user!.userId,
    action: 'RESET_PASSWORD',
    entity: 'User',
    entityId: req.params.id,
    ipAddress: getClientIp(req),
  });

  res.json({ data: { message: 'Password reset successfully. User must change password on next login.' } });
});

export default router;
