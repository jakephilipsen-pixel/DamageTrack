import path from 'path';
import fs from 'fs';
import { createTransporter } from '../config/email';
import prisma from '../config/database';
import logger from '../utils/logger';
import { format } from 'date-fns';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

type FullDamageReport = Awaited<ReturnType<typeof import('./damageService').getDamageById>>;

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'MINOR': return '#22c55e';
    case 'MODERATE': return '#f59e0b';
    case 'MAJOR': return '#ef4444';
    case 'TOTAL_LOSS': return '#7f1d1d';
    default: return '#6b7280';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN': return '#3b82f6';
    case 'CUSTOMER_NOTIFIED': return '#f59e0b';
    case 'DESTROY_STOCK': return '#ef4444';
    case 'REP_COLLECT': return '#8b5cf6';
    case 'CLOSED': return '#22c55e';
    default: return '#6b7280';
  }
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getBranding() {
  const settings = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
  return settings || {
    companyName: 'DamageTrack',
    tagline: 'Warehouse Damage Management',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b',
    accentColor: '#10b981',
    emailFromName: null,
    logoPath: null,
  };
}

function getLogoBase64(): string | null {
  const logoPath = path.resolve(UPLOAD_DIR, 'branding', 'logo-medium.png');
  if (fs.existsSync(logoPath)) {
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
  return null;
}

function buildEmailHtml(
  report: FullDamageReport,
  bodyText: string,
  branding: Awaited<ReturnType<typeof getBranding>>
): string {
  const companyName = branding.companyName;
  const headerColor = branding.secondaryColor;
  const logoBase64 = getLogoBase64();
  const reporterName = report.reportedBy
    ? `${report.reportedBy.firstName} ${report.reportedBy.lastName}`
    : 'Unknown';
  const reviewerName = report.reviewedBy
    ? `${report.reportedBy.firstName} ${report.reportedBy.lastName}`
    : 'Not assigned';
  const locationLabel = (report as any).warehouseLocation
    ? `${(report as any).warehouseLocation.code}${(report as any).warehouseLocation.zone ? ` (${(report as any).warehouseLocation.zone})` : ''}`
    : 'Not specified';

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="${companyName}" style="max-height:40px;margin-right:16px;vertical-align:middle;" />`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Damage Report ${report.referenceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
    .wrapper { max-width: 680px; margin: 0 auto; background: #ffffff; }
    .header { background: ${headerColor}; color: #ffffff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; display: inline; vertical-align: middle; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.8; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #fff; }
    .content { padding: 32px; }
    .intro-text { background: #f8fafc; border-left: 4px solid ${headerColor}; padding: 16px; margin-bottom: 24px; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #374151; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 24px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    table.details { width: 100%; border-collapse: collapse; }
    table.details tr td { padding: 8px 0; font-size: 14px; vertical-align: top; }
    table.details tr td:first-child { color: #6b7280; width: 180px; font-weight: 500; }
    table.details tr td:last-child { color: #111827; font-weight: 400; }
    .description-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; font-size: 14px; line-height: 1.7; color: #374151; }
    .footer { background: #f3f4f6; padding: 24px 32px; font-size: 12px; color: #9ca3af; text-align: center; }
    .footer a { color: ${headerColor}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      ${logoHtml}<h1>${companyName} — Damage Report</h1>
      <p>Reference: <strong>${report.referenceNumber}</strong></p>
    </div>
    <div class="content">
      ${bodyText ? `<div class="intro-text">${bodyText.replace(/\n/g, '<br />')}</div>` : ''}

      <div class="section-title">Report Status</div>
      <table class="details">
        <tr>
          <td>Status</td>
          <td><span class="badge" style="background:${getStatusColor(report.status)}">${formatLabel(report.status)}</span></td>
        </tr>
        <tr>
          <td>Severity</td>
          <td><span class="badge" style="background:${getSeverityColor(report.severity)}">${formatLabel(report.severity)}</span></td>
        </tr>
      </table>

      <div class="section-title">Damage Details</div>
      <table class="details">
        <tr><td>Reference #</td><td>${report.referenceNumber}</td></tr>
        <tr><td>Customer</td><td>${report.customer.name} (${report.customer.code})</td></tr>
        <tr><td>Product</td><td>${report.product.name} — SKU: ${report.product.sku}</td></tr>
        <tr><td>Quantity Damaged</td><td>${report.quantity} unit(s)</td></tr>
        <tr><td>Cause</td><td>${formatLabel(report.cause)}${report.causeOther ? ` — ${report.causeOther}` : ''}</td></tr>
        <tr><td>Location</td><td>${locationLabel}</td></tr>
        <tr><td>Date of Damage</td><td>${format(new Date(report.dateOfDamage), 'dd MMM yyyy')}</td></tr>
        <tr><td>Date Reported</td><td>${format(new Date(report.dateReported), 'dd MMM yyyy HH:mm')}</td></tr>
        <tr><td>Reported By</td><td>${reporterName}</td></tr>
        <tr><td>Reviewed By</td><td>${reviewerName}</td></tr>
        <tr><td>Estimated Loss</td><td>${report.estimatedLoss !== null && report.estimatedLoss !== undefined ? `$${Number(report.estimatedLoss).toFixed(2)}` : 'Not estimated'}</td></tr>
        ${report.dateResolved ? `<tr><td>Date Resolved</td><td>${format(new Date(report.dateResolved), 'dd MMM yyyy')}</td></tr>` : ''}
      </table>

      <div class="section-title">Description</div>
      <div class="description-box">${report.description}</div>

      ${(report as FullDamageReport & { _count?: { photos: number } })._count?.photos
        ? `<p style="margin-top:24px;font-size:13px;color:#6b7280;">${(report as FullDamageReport & { _count?: { photos: number } })._count?.photos} photo(s) attached to this report.</p>`
        : ''}
    </div>
    <div class="footer">
      <p>This email was sent by <strong>${companyName}</strong> Warehouse Damage Management System.</p>
      <p>Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')} UTC</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendStatusChangeNotification(
  report: FullDamageReport,
  changedByUsername: string
): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  const branding = await getBranding();
  const companyName = branding.companyName;
  const headerColor = branding.secondaryColor;
  const logoBase64 = getLogoBase64();

  const lastHistory = Array.isArray((report as any).statusHistory) && (report as any).statusHistory.length > 0
    ? (report as any).statusHistory[(report as any).statusHistory.length - 1]
    : null;

  const fromStatus = lastHistory?.fromStatus ? formatLabel(lastHistory.fromStatus) : 'N/A';
  const toStatus = formatLabel(report.status);
  const note = lastHistory?.note || '';
  const timestamp = format(new Date(), 'dd MMM yyyy HH:mm') + ' UTC';

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="${companyName}" style="max-height:36px;margin-right:12px;vertical-align:middle;" />`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Status Update — ${report.referenceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
    .wrapper { max-width: 580px; margin: 0 auto; background: #fff; }
    .header { background: ${headerColor}; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; display: inline; vertical-align: middle; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.8; }
    .content { padding: 32px; font-size: 14px; color: #374151; line-height: 1.6; }
    .status-row { display: flex; align-items: center; gap: 12px; margin: 16px 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #fff; }
    .note-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; margin-top: 16px; }
    .footer { background: #f3f4f6; padding: 16px 32px; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      ${logoHtml}<h1>${companyName} — Status Update</h1>
      <p>Reference: <strong>${report.referenceNumber}</strong></p>
    </div>
    <div class="content">
      <p>The status of damage report <strong>${report.referenceNumber}</strong> has been updated by <strong>${changedByUsername}</strong>.</p>
      <div class="status-row">
        <span class="badge" style="background:${getStatusColor(lastHistory?.fromStatus || '')}">${fromStatus}</span>
        <span>→</span>
        <span class="badge" style="background:${getStatusColor(report.status)}">${toStatus}</span>
      </div>
      ${note ? `<div class="note-box"><strong>Note:</strong> ${note}</div>` : ''}
      <p style="margin-top:16px;color:#6b7280;font-size:13px;">Changed on ${timestamp}</p>
    </div>
    <div class="footer">
      <p>This email was sent by <strong>${companyName}</strong> Warehouse Damage Management System.</p>
    </div>
  </div>
</body>
</html>`.trim();

  const transporter = createTransporter();
  const subject = `[${companyName}] Status Update: ${report.referenceNumber} → ${toStatus}`;

  const fromName = branding.emailFromName || companyName;
  const fromAddress = process.env.SMTP_FROM || 'noreply@damagetrack.local';

  const recipients: string[] = [];
  if (report.reportedBy?.email) {
    recipients.push(report.reportedBy.email);
  }
  if (report.status === 'CUSTOMER_NOTIFIED' && report.customer?.email) {
    recipients.push(report.customer.email);
  }

  if (recipients.length === 0) return;

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: recipients.join(', '),
    subject,
    html,
  });

  logger.info('Status change notification sent', {
    referenceNumber: report.referenceNumber,
    toStatus: report.status,
    recipients,
  });
}

export async function sendDamageReport(
  report: FullDamageReport,
  to: string,
  subject: string,
  bodyText: string,
  includePhotos: boolean,
  sentByUserId: string
): Promise<void> {
  const branding = await getBranding();
  const transporter = createTransporter();
  const html = buildEmailHtml(report, bodyText, branding);

  const fromName = branding.emailFromName || branding.companyName;
  const fromAddress = process.env.SMTP_FROM || 'noreply@damagetrack.local';

  const attachments: { filename: string; path: string }[] = [];

  if (includePhotos && 'photos' in report && Array.isArray(report.photos)) {
    const uploadsAbsolute = path.resolve(process.cwd(), UPLOAD_DIR);
    for (const photo of report.photos as { path: string; originalName: string; filename: string }[]) {
      const absolutePath = path.join(
        uploadsAbsolute,
        photo.path.replace('/uploads/', '')
      );
      if (fs.existsSync(absolutePath)) {
        attachments.push({
          filename: photo.originalName || photo.filename,
          path: absolutePath,
        });
      }
    }
  }

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    attachments,
  });

  await prisma.emailExport.create({
    data: {
      damageReportId: report.id,
      sentTo: to,
      sentBy: sentByUserId,
      subject,
      includePhotos,
    },
  });

  logger.info('Damage report email sent', {
    referenceNumber: report.referenceNumber,
    to,
    attachments: attachments.length,
  });
}
