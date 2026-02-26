import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { DamageStatus, DamageSeverity, DamageCause } from '@prisma/client';

function formatLabel(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type FullDamageReport = Awaited<ReturnType<typeof import('./damageService').getDamageById>>;

export async function generatePDF(report: FullDamageReport): Promise<Buffer> {
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
    const primaryColor = '#1e3a5f';
    const accentColor = '#e74c3c';

    doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('DAMAGE REPORT', 60, 22);

    doc.fontSize(11)
      .font('Helvetica')
      .text(`Reference: ${report.referenceNumber}`, 60, 50);

    doc.fillColor('#ffffff').font('Helvetica')
      .fontSize(10)
      .text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 60, 50, {
        align: 'right',
        width: pageWidth,
      });

    doc.moveDown(4);

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
      doc.rect(60, y, pageWidth, 22).fill('#e8edf4');
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
        .text(`Note: This report has ${photoCount} photo(s) attached. View them in the DamageTrack system.`, 60, doc.y, {
          width: pageWidth,
        });
    }

    if (accentColor) {
      const footerY = doc.page.height - 45;
      doc.rect(0, footerY, doc.page.width, 1).fill('#e5e7eb');
      doc.fillColor('#9ca3af').font('Helvetica').fontSize(8)
        .text(
          `DamageTrack — Warehouse Damage Management System | Report: ${report.referenceNumber} | Page 1`,
          60,
          footerY + 10,
          { width: pageWidth, align: 'center' }
        );
    }

    doc.end();
  });
}

export async function generateCSV(filters: {
  dateFrom?: string;
  dateTo?: string;
  status?: DamageStatus;
  customerId?: string;
  severity?: DamageSeverity;
  cause?: DamageCause;
}): Promise<string> {
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

  const reports = await prisma.damageReport.findMany({
    where,
    include: {
      customer: { select: { name: true, code: true } },
      product: { select: { sku: true, name: true } },
      reportedBy: { select: { username: true, firstName: true, lastName: true } },
    },
    orderBy: { dateReported: 'desc' },
  });

  const csvRows: string[] = [];

  const headers = [
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

  csvRows.push(headers.map((h) => `"${h}"`).join(','));

  for (const report of reports) {
    const row = [
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

    csvRows.push(row.map((cell) => `"${cell}"`).join(','));
  }

  return csvRows.join('\n');
}
