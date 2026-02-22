import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { JwtPayload, LoginResult, TokenPair } from '../types';
import { Role } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
  return secret;
}

export function generateTokens(user: {
  id: string;
  username: string;
  role: Role;
}): TokenPair {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, getJwtRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export async function login(
  username: string,
  password: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase().trim() },
  });

  if (!user) {
    throw Object.assign(new Error('Invalid username or password'), { status: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account is deactivated. Please contact an administrator.'), {
      status: 401,
    });
  }

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    throw Object.assign(new Error('Invalid username or password'), { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const tokens = generateTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      lastLogin: user.lastLogin,
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtRefreshSecret()) as JwtPayload;
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, role: true, isActive: true },
  });

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account is deactivated'), { status: 401 });
  }

  return generateTokens(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const passwordValid = await bcrypt.compare(currentPassword, user.password);
  if (!passwordValid) {
    throw Object.assign(new Error('Current password is incorrect'), { status: 400 });
  }

  if (currentPassword === newPassword) {
    throw Object.assign(new Error('New password must be different from current password'), {
      status: 400,
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  });
}

export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      mustChangePassword: true,
    },
  });
}
