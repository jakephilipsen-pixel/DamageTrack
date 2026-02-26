-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'WAREHOUSE_USER');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('OPEN', 'CUSTOMER_NOTIFIED', 'DESTROY_STOCK', 'REP_COLLECT', 'CLOSED');

-- CreateEnum
CREATE TYPE "DamageSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'TOTAL_LOSS');

-- CreateEnum
CREATE TYPE "DamageCause" AS ENUM ('FORKLIFT_IMPACT', 'DROPPED_DURING_HANDLING', 'WATER_DAMAGE', 'CRUSH_DAMAGE', 'PALLET_FAILURE', 'TEMPERATURE_EXPOSURE', 'INCORRECT_STACKING', 'TRANSIT_DAMAGE_INBOUND', 'TRANSIT_DAMAGE_OUTBOUND', 'PEST_DAMAGE', 'EXPIRED_PRODUCT', 'PACKAGING_FAILURE', 'UNKNOWN', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WAREHOUSE_USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "contactName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT,
    "unitValue" DECIMAL(10,2),
    "customerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseLocation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zone" TEXT,
    "aisle" TEXT,
    "rack" TEXT,
    "shelf" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageReport" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "severity" "DamageSeverity",
    "cause" "DamageCause" NOT NULL,
    "causeOther" TEXT,
    "description" TEXT NOT NULL,
    "warehouseLocationId" TEXT,
    "status" "DamageStatus" NOT NULL DEFAULT 'OPEN',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "estimatedLoss" DECIMAL(10,2),
    "reportedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "dateOfDamage" TIMESTAMP(3) NOT NULL,
    "dateReported" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateResolved" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamagePhoto" (
    "id" TEXT NOT NULL,
    "damageReportId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamagePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageComment" (
    "id" TEXT NOT NULL,
    "damageReportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "damageReportId" TEXT NOT NULL,
    "fromStatus" "DamageStatus",
    "toStatus" "DamageStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedByUser" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailExport" (
    "id" TEXT NOT NULL,
    "damageReportId" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "includePhotos" BOOLEAN NOT NULL DEFAULT true,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'DamageTrack',
    "tagline" TEXT DEFAULT 'Warehouse Damage Management',
    "logoPath" TEXT,
    "logoMimeType" TEXT,
    "faviconPath" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1e293b',
    "accentColor" TEXT NOT NULL DEFAULT '#10b981',
    "emailFromName" TEXT,
    "pdfFooterText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "BrandingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_customerId_key" ON "Product"("sku", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseLocation_code_key" ON "WarehouseLocation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DamageReport_referenceNumber_key" ON "DamageReport"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_warehouseLocationId_fkey" FOREIGN KEY ("warehouseLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamagePhoto" ADD CONSTRAINT "DamagePhoto_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "DamageReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageComment" ADD CONSTRAINT "DamageComment_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "DamageReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageComment" ADD CONSTRAINT "DamageComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "DamageReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailExport" ADD CONSTRAINT "EmailExport_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "DamageReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

