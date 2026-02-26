import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import { validateEnv } from './utils/validateEnv';
validateEnv();

import logger from './utils/logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { swaggerUi, swaggerSpec } from './config/swagger';
import authRoutes from './routes/auth';
import damageRoutes from './routes/damages';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import photoRoutes from './routes/photos';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';
import exportRoutes from './routes/export';
import adminRoutes from './routes/admin';
import importRoutes from './routes/import';
import notificationRoutes from './routes/notifications';
import warehouseLocationRoutes from './routes/warehouseLocations';
import brandingRoutes from './routes/branding';

const app = express();
const PORT = process.env.APP_PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'branding'), { recursive: true });
fs.mkdirSync(path.resolve(process.cwd(), 'logs'), { recursive: true });

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.APP_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(
  morgan('combined', {
    stream: { write: (msg: string) => logger.info(msg.trim()) },
  })
);

app.use(
  '/uploads',
  express.static(path.resolve(UPLOAD_DIR), {
    maxAge: '1d',
    etag: true,
  })
);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/branding', brandingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/damages', authenticate, damageRoutes);
app.use('/api/customers', authenticate, customerRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/photos', authenticate, photoRoutes);
app.use('/api/reports', authenticate, reportRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/export', authenticate, exportRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/import', authenticate, importRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/warehouse-locations', authenticate, warehouseLocationRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(
    `DamageTrack server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`
  );
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

export default app;
