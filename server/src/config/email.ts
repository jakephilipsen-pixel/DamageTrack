import nodemailer from 'nodemailer';
import logger from '../utils/logger';

export function createTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function verifyEmailConfig(): Promise<void> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email configuration verified');
  } catch (error) {
    logger.warn('Email configuration could not be verified - email features may not work', { error });
  }
}
