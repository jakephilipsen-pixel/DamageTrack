import logger from './logger';

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
const OPTIONAL = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'UPLOAD_DIR'] as const;

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}. Exiting.`);
    process.exit(1);
  }

  for (const key of OPTIONAL) {
    if (!process.env[key]) {
      logger.warn(`Optional environment variable not set: ${key}. Some features may be disabled.`);
    }
  }
}
