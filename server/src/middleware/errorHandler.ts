import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorHandler(
  err: Error & { status?: number; statusCode?: number; code?: string; name?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.name === 'MulterError') {
    const multerErr = err as Error & { code?: string };
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      return;
    }
    if (multerErr.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.code === 'P2002') {
    res.status(409).json({ error: 'A record with this value already exists.' });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({ error: 'Record not found.' });
    return;
  }

  const status = err.status || err.statusCode || 500;
  const message =
    status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ error: message });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}
