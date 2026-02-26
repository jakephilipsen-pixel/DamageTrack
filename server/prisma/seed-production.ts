import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== DAMAGETRACK PRODUCTION RESEED ===');
  console.log('This is a DESTRUCTIVE reset — clearing transactional data.\n');

  // 1. Delete transactional data (child tables first)
  const emailExports = await prisma.emailExport.deleteMany({});
  console.log(`  EmailExports deleted: ${emailExports.count}`);

  const photos = await prisma.damagePhoto.deleteMany({});
  console.log(`  DamagePhotos deleted: ${photos.count}`);

  const comments = await prisma.damageComment.deleteMany({});
  console.log(`  DamageComments deleted: ${comments.count}`);

  const statusHistory = await prisma.statusHistory.deleteMany({});
  console.log(`  StatusHistory deleted: ${statusHistory.count}`);

  const auditLogs = await prisma.auditLog.deleteMany({});
  console.log(`  AuditLogs deleted: ${auditLogs.count}`);

  const damageReports = await prisma.damageReport.deleteMany({});
  console.log(`  DamageReports deleted: ${damageReports.count}`);

  // 2. Delete all users except admin
  const deletedUsers = await prisma.user.deleteMany({
    where: { username: { not: 'admin' } },
  });
  console.log(`  Users deleted: ${deletedUsers.count} (kept admin)`);

  // 3. Reset admin account
  const adminPassword = await bcrypt.hash('DamageTrack2024!', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: true,
    },
    create: {
      username: 'admin',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      email: 'admin@damagetrack.local',
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log('  Admin account: RESET (admin / DamageTrack2024!)');

  // 4. Check reference data
  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
    console.log('  No customers found — add real customers via the app.');
  } else {
    console.log(`  Customers preserved: ${customerCount}`);
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    console.log('  No products found — add real products via the app.');
  } else {
    console.log(`  Products preserved: ${productCount}`);
  }

  const locationCount = await prisma.warehouseLocation.count();
  if (locationCount === 0) {
    console.log('  No warehouse locations found — add via CSV upload or the app.');
  } else {
    console.log(`  Warehouse locations preserved: ${locationCount}`);
  }

  // 5. Ensure branding settings exist (don't touch if already present)
  const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
  if (!branding) {
    await prisma.brandingSettings.create({
      data: {
        id: 'default',
        companyName: 'DamageTrack',
        tagline: 'Warehouse Damage Management',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e293b',
        accentColor: '#10b981',
      },
    });
    console.log('  Branding: CREATED (defaults)');
  } else {
    console.log('  Branding: PRESERVED');
  }

  // 6. Clean up damage photo uploads (keep branding/)
  const uploadsBase = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const damageUploadsDir = path.join(uploadsBase, 'damages');
  if (fs.existsSync(damageUploadsDir)) {
    fs.rmSync(damageUploadsDir, { recursive: true, force: true });
    fs.mkdirSync(damageUploadsDir, { recursive: true });
    console.log('  Photo uploads: CLEARED');
  } else {
    console.log('  Photo uploads: (none to clear)');
  }

  // 7. Summary
  console.log('\n=== PRODUCTION RESEED COMPLETE ===');
  console.log(`  Damage Reports deleted: ${damageReports.count}`);
  console.log(`  Photos deleted: ${photos.count}`);
  console.log(`  Comments deleted: ${comments.count}`);
  console.log(`  Status History deleted: ${statusHistory.count}`);
  console.log(`  Audit Logs deleted: ${auditLogs.count}`);
  console.log(`  Email Exports deleted: ${emailExports.count}`);
  console.log(`  Users deleted: ${deletedUsers.count} (kept admin)`);
  console.log('  ---');
  console.log(`  Remaining Customers: ${customerCount}`);
  console.log(`  Remaining Products: ${productCount}`);
  console.log(`  Remaining Locations: ${locationCount}`);
  console.log('  Branding: PRESERVED');
  console.log('  Admin account: RESET (admin / DamageTrack2024!)');
  console.log('  Photo uploads: CLEARED');
  console.log('===================================\n');
}

main()
  .catch((e) => {
    console.error('Production seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
