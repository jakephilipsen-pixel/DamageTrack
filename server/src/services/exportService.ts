import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { DamageStatus, DamageSeverity, DamageCause } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

function formatLabel(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

type FullDamageReport = Awaited<ReturnType<typeof import('./damageService').getDamageById>>;

async function getBranding() {
  const settings = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
  return settings || {
    companyName: 'DamageTrack',
    tagline: 'Warehouse Damage Management',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b',
    accentColor: '#10b981',
    pdfFooterText: null,
    logoPath: null,
  };
}

export async function generatePDF(report: FullDamageReport): Promise<Buffer> {
  const branding = await getBranding();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 120;
    const primaryColor = branding.primaryColor;
    const secondaryColor = branding.secondaryColor;
    const sectionBgColor = lightenColor(primaryColor, 0.85);

    // Header background
    doc.rect(0, 0, doc.page.width, 80).fill(secondaryColor);

    // Logo + Company name in header
    let headerTextX = 60;
    const logoPath = path.resolve(UPLOAD_DIR, 'branding', 'logo-pdf.png');
    if (branding.logoPath && fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 60, 12, { height: 56 });
        headerTextX = 180;
      } catch {
        // Logo failed to load, use text only
      }
    }

    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('DAMAGE REPORT', headerTextX, 22);

    doc.fontSize(11)
      .font('Helvetica')
      .text(`Reference: ${report.referenceNumber}`, headerTextX, 50);

    doc.fillColor('#ffffff').font('Helvetica')
      .fontSize(10)
      .text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 60, 50, {
        align: 'right',
        width: pageWidth,
      });

    doc.moveDown(4);

    // Status badge
    const statusColors: Record<string, string> = {
      OPEN: '#3b82f6',
      CUSTOMER_NOTIFIED: '#f59e0b',
      DESTROY_STOCK: '#ef4444',
      REP_COLLECT: '#8b5cf6',
      CLOSED: '#22c55e',
    };

    const statusBadgeColor = statusColors[report.status] || '#6b7280';
    const badgeY = doc.y;
    const badgeHeight = 22;

    doc.roundedRect(60, badgeY, 180, badgeHeight, 4).fill(statusBadgeColor);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text(`STATUS: ${formatLabel(report.status)}`, 60, badgeY + 7, {
        width: 180,
        align: 'center',
      });

    doc.moveDown(2.5);

    function sectionHeader(title: string): void {
      const y = doc.y;
      doc.rect(60, y, pageWidth, 22).fill(sectionBgColor);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11)
        .text(title, 68, y + 6);
      doc.moveDown(1.5);
    }

    function fieldRow(label: string, value: string, startX = 60, colWidth = pageWidth): void {
      const y = doc.y;
      doc.fillColor('#6b7280').font('Helvetica').fontSize(9)
        .text(label.toUpperCase(), startX, y, { width: colWidth * 0.35 });
      doc.fillColor('#111827').font('Helvetica').fontSize(10)
        .text(value, startX + colWidth * 0.36, y, { width: colWidth * 0.64 });
      doc.moveDown(0.6);
    }

    sectionHeader('Customer & Product Information');

    const colLeft = 60;
    const colRight = 60 + pageWidth / 2 + 10;
    const colW = pageWidth / 2 - 10;

    const leftStartY = doc.y;
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text('CUSTOMER', colLeft, leftStartY, { width: colW });
    doc.fillColor('#111827').font('Helvetica').fontSize(10)
      .text(`${report.customer.name} (${report.customer.code})`, colLeft, doc.y, { width: colW });

    const rightStartY = leftStartY;
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text('PRODUCT', colRight, rightStartY, { width: colW });
    doc.fillColor('#111827').font('Helvetica').fontSize(10)
      .text(report.product.name, colRight, rightStartY + 11, { width: colW });

    doc.moveDown(1.2);

    const skuY = doc.y;
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text('SKU', colLeft, skuY, { width: colW });
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10)
      .text(report.product.sku, colLeft, skuY + 11, { width: colW });

    doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text('UNIT VALUE', colRight, skuY, { width: colW });
    const unitVal = report.product.unitValue !== null && report.product.unitValue !== undefined
      ? `$${Number(report.product.unitValue).toFixed(2)}`
      : 'N/A';
    doc.fillColor('#111827').font('Helvetica').fontSize(10)
      .text(unitVal, colRight, skuY + 11, { width: colW });

    doc.moveDown(2);
    sectionHeader('Damage Information');

    fieldRow('Date of Damage', format(new Date(report.dateOfDamage), 'dd MMM yyyy'));
    fieldRow('Date Reported', format(new Date(report.dateReported), 'dd MMM yyyy HH:mm'));
    fieldRow('Quantity Damaged', `${report.quantity} unit(s)`);
    fieldRow('Cause', formatLabel(report.cause) + (report.causeOther ? ` — ${report.causeOther}` : ''));
    const locationLabel = report.warehouseLocation
      ? `${report.warehouseLocation.code}${report.warehouseLocation.zone ? ` (${report.warehouseLocation.zone})` : ''}`
      : 'Not specified';
    fieldRow('Location in Warehouse', locationLabel);

    const reporterName = report.reportedBy
      ? `${report.reportedBy.firstName} ${report.reportedBy.lastName} (${report.reportedBy.username})`
      : 'Unknown';
    fieldRow('Reported By', reporterName);

    const reviewerName = report.reviewedBy
      ? `${report.reviewedBy.firstName} ${report.reviewedBy.lastName} (${report.reviewedBy.username})`
      : 'Not assigned';
    fieldRow('Reviewed By', reviewerName);

    if (report.dateResolved) {
      fieldRow('Date Resolved', format(new Date(report.dateResolved), 'dd MMM yyyy'));
    }

    doc.moveDown(1);
    sectionHeader('Description');

    doc.fillColor('#374151').font('Helvetica').fontSize(10)
      .text(report.description, 60, doc.y, {
        width: pageWidth,
        lineGap: 4,
      });

    doc.moveDown(1.5);

    const photoCount = 'photos' in report && Array.isArray(report.photos)
      ? (report.photos as unknown[]).length
      : 0;

    if (photoCount > 0) {
      doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9)
        .text(`Note: This report has ${photoCount} photo(s) attached. View them in the ${branding.companyName} system.`, 60, doc.y, {
          width: pageWidth,
        });
    }

    // Footer
    const footerY = doc.page.height - 50;
    // Subtle footer bar
    doc.rect(0, footerY - 5, doc.page.width, 1).fill(lightenColor(secondaryColor, 0.7));

    const footerText = branding.pdfFooterText || branding.companyName;
    const generatedDate = format(new Date(), 'dd MMM yyyy HH:mm');

    doc.fillColor('#9ca3af').font('Helvetica').fontSize(8)
      .text(footerText, 60, footerY + 5, { width: pageWidth * 0.4, align: 'left' });

    doc.fillColor('#9ca3af').font('Helvetica').fontSize(8)
      .text(generatedDate, 60 + pageWidth * 0.35, footerY + 5, { width: pageWidth * 0.3, align: 'center' });

    doc.fillColor('#9ca3af').font('Helvetica').fontSize(8)
      .text(`Page 1 of 1`, 60 + pageWidth * 0.6, footerY + 5, { width: pageWidth * 0.4, align: 'right' });

    doc.end();
  });
}

function buildCsvWhere(filters: {
  dateFrom?: string;
  dateTo?: string;
  status?: DamageStatus;
  customerId?: string;
  severity?: DamageSeverity;
  cause?: DamageCause;
}): Prisma.DamageReportWhereInput {
  const where: Prisma.DamageReportWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.severity) where.severity = filters.severity;
  if (filters.cause) where.cause = filters.cause;

  if (filters.dateFrom || filters.dateTo) {
    where.dateOfDamage = {};
    if (filters.dateFrom) {
      (where.dateOfDamage as Record<string, unknown>).gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      (where.dateOfDamage as Record<string, unknown>).lte = new Date(filters.dateTo);
    }
  }

  return where;
}

function formatCsvRow(report: {
  referenceNumber: string;
  dateOfDamage: Date;
  customer: { code: string; name: string };
  product: { sku: string; name: string };
  quantity: number;
  severity: DamageSeverity | null;
  cause: DamageCause;
  causeOther: string | null;
  description: string;
  status: DamageStatus;
  reportedBy: { firstName: string; lastName: string };
  estimatedLoss: unknown;
  dateReported: Date;
  dateResolved: Date | null;
}): string {
  const cells = [
    report.referenceNumber,
    format(new Date(report.dateOfDamage), 'yyyy-MM-dd'),
    report.customer.code,
    report.customer.name,
    report.product.sku,
    report.product.name,
    String(report.quantity),
    formatLabel(report.severity),
    formatLabel(report.cause) + (report.causeOther ? ` (${report.causeOther})` : ''),
    report.description.replace(/"/g, '""'),
    formatLabel(report.status),
    `${report.reportedBy.firstName} ${report.reportedBy.lastName}`,
    report.estimatedLoss !== null && report.estimatedLoss !== undefined
      ? Number(report.estimatedLoss).toFixed(2)
      : '',
    format(new Date(report.dateReported), 'yyyy-MM-dd HH:mm:ss'),
    report.dateResolved ? format(new Date(report.dateResolved), 'yyyy-MM-dd') : '',
  ];
  return cells.map((cell) => `"${cell}"`).join(',');
}

const CSV_HEADERS = [
  'Reference #',
  'Date of Damage',
  'Customer Code',
  'Customer Name',
  'Product SKU',
  'Product Name',
  'Quantity',
  'Severity',
  'Cause',
  'Description',
  'Status',
  'Reporter',
  'Estimated Loss',
  'Date Reported',
  'Date Resolved',
];

const CSV_BATCH_SIZE = 500;

export async function streamCSV(
  res: import('express').Response,
  filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: DamageStatus;
    customerId?: string;
    severity?: DamageSeverity;
    cause?: DamageCause;
  }
): Promise<void> {
  const where = buildCsvWhere(filters);

  // Write BOM + header
  res.write('\uFEFF' + CSV_HEADERS.map((h) => `"${h}"`).join(',') + '\n');

  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const batch = await prisma.damageReport.findMany({
      where,
      include: {
        customer: { select: { name: true, code: true } },
        product: { select: { sku: true, name: true } },
        reportedBy: { select: { username: true, firstName: true, lastName: true } },
      },
      orderBy: { dateReported: 'desc' },
      take: CSV_BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    const chunk = batch.map((report) => formatCsvRow(report)).join('\n') + '\n';
    res.write(chunk);

    cursor = batch[batch.length - 1].id;
    hasMore = batch.length === CSV_BATCH_SIZE;
  }

  res.end();
}
