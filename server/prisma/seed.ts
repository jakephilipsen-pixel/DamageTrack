import { PrismaClient, Role, DamageStatus, DamageSeverity, DamageCause, WarehouseLocation } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, subHours, subMonths } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');

  await prisma.emailExport.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.damageComment.deleteMany();
  await prisma.damagePhoto.deleteMany();
  await prisma.damageReport.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.warehouseLocation.deleteMany();
  await prisma.systemSetting.deleteMany();

  console.log('Creating users...');

  const adminPassword = await bcrypt.hash('DamageTrack2024!', 12);
  const manager1Password = await bcrypt.hash('Manager2024!', 12);
  const manager2Password = await bcrypt.hash('Manager2024!', 12);
  const warehousePassword = await bcrypt.hash('Warehouse2024!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@damagetrack.local',
      username: 'admin',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.ADMIN,
      mustChangePassword: true,
      isActive: true,
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      email: 'sarah.johnson@damagetrack.local',
      username: 'sjohnson',
      password: manager1Password,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: Role.MANAGER,
      mustChangePassword: false,
      isActive: true,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: 'michael.chen@damagetrack.local',
      username: 'mchen',
      password: manager2Password,
      firstName: 'Michael',
      lastName: 'Chen',
      role: Role.MANAGER,
      mustChangePassword: false,
      isActive: true,
    },
  });

  const warehouse1 = await prisma.user.create({
    data: {
      email: 'james.riley@damagetrack.local',
      username: 'jriley',
      password: warehousePassword,
      firstName: 'James',
      lastName: 'Riley',
      role: Role.WAREHOUSE_USER,
      mustChangePassword: false,
      isActive: true,
    },
  });

  const warehouse2 = await prisma.user.create({
    data: {
      email: 'maria.santos@damagetrack.local',
      username: 'msantos',
      password: warehousePassword,
      firstName: 'Maria',
      lastName: 'Santos',
      role: Role.WAREHOUSE_USER,
      mustChangePassword: false,
      isActive: true,
    },
  });

  const warehouse3 = await prisma.user.create({
    data: {
      email: 'david.patel@damagetrack.local',
      username: 'dpatel',
      password: warehousePassword,
      firstName: 'David',
      lastName: 'Patel',
      role: Role.WAREHOUSE_USER,
      mustChangePassword: false,
      isActive: true,
    },
  });

  console.log('Creating customers...');

  const acme = await prisma.customer.create({
    data: {
      name: 'Acme Corporation',
      code: 'ACME',
      email: 'logistics@acmecorp.com',
      phone: '+1-555-0100',
      contactName: 'Wile E. Coyote',
      isActive: true,
    },
  });

  const globex = await prisma.customer.create({
    data: {
      name: 'Globex Industries',
      code: 'GLOBEX',
      email: 'warehouse@globex.com',
      phone: '+1-555-0200',
      contactName: 'Hank Scorpio',
      isActive: true,
    },
  });

  const initech = await prisma.customer.create({
    data: {
      name: 'Initech Corp',
      code: 'INITECH',
      email: 'supply@initech.com',
      phone: '+1-555-0300',
      contactName: 'Bill Lumbergh',
      isActive: true,
    },
  });

  const wayne = await prisma.customer.create({
    data: {
      name: 'Wayne Enterprises',
      code: 'WAYNEENT',
      email: 'logistics@wayneenterprises.com',
      phone: '+1-555-0400',
      contactName: 'Lucius Fox',
      isActive: true,
    },
  });

  const stark = await prisma.customer.create({
    data: {
      name: 'Stark Industries',
      code: 'STARKINC',
      email: 'supply.chain@starkindustries.com',
      phone: '+1-555-0500',
      contactName: 'Pepper Potts',
      isActive: true,
    },
  });

  console.log('Creating products...');

  const acmeProduct1 = await prisma.product.create({
    data: {
      sku: 'ACME-WDG-001',
      name: 'Super Widget Pro',
      barcode: '0012345678901',
      description: 'High-performance industrial widget for heavy-duty applications',
      unitValue: 149.99,
      customerId: acme.id,
    },
  });

  const acmeProduct2 = await prisma.product.create({
    data: {
      sku: 'ACME-CRK-002',
      name: 'Rocket Skates (Pair)',
      barcode: '0012345678902',
      description: 'ACME brand rocket-propelled skates, model 7',
      unitValue: 499.0,
      customerId: acme.id,
    },
  });

  const acmeProduct3 = await prisma.product.create({
    data: {
      sku: 'ACME-TNT-003',
      name: 'Portable Hole Kit',
      barcode: '0012345678903',
      description: 'Reusable portable hole, 24-inch diameter',
      unitValue: 89.95,
      customerId: acme.id,
    },
  });

  const globexProduct1 = await prisma.product.create({
    data: {
      sku: 'GLX-CHM-001',
      name: 'Industrial Solvent Tank',
      barcode: '0023456789001',
      description: 'Chemical-grade solvent storage tank, 55-gallon capacity',
      unitValue: 320.0,
      customerId: globex.id,
    },
  });

  const globexProduct2 = await prisma.product.create({
    data: {
      sku: 'GLX-ELC-002',
      name: 'High-Voltage Capacitor Array',
      barcode: '0023456789002',
      description: 'Precision-grade capacitor array for power regulation systems',
      unitValue: 1250.0,
      customerId: globex.id,
    },
  });

  const initechProduct1 = await prisma.product.create({
    data: {
      sku: 'ITC-SRV-001',
      name: 'Rack Mount Server Unit',
      barcode: '0034567890001',
      description: '2U rack mount server, 64GB RAM, 4TB NVMe',
      unitValue: 4500.0,
      customerId: initech.id,
    },
  });

  const initechProduct2 = await prisma.product.create({
    data: {
      sku: 'ITC-OFC-002',
      name: 'Office Chair (Ergonomic)',
      barcode: '0034567890002',
      description: 'High-back mesh ergonomic office chair with lumbar support',
      unitValue: 275.5,
      customerId: initech.id,
    },
  });

  const wayneProduct1 = await prisma.product.create({
    data: {
      sku: 'WNE-BAT-001',
      name: 'Advanced Power Cell',
      barcode: '0045678900001',
      description: 'High-density lithium power cell, 100kWh equivalent',
      unitValue: 8750.0,
      customerId: wayne.id,
    },
  });

  const wayneProduct2 = await prisma.product.create({
    data: {
      sku: 'WNE-SEC-002',
      name: 'Encrypted Communications Module',
      barcode: '0045678900002',
      description: 'Military-grade encrypted communication hardware',
      unitValue: 3200.0,
      customerId: wayne.id,
    },
  });

  const starkProduct1 = await prisma.product.create({
    data: {
      sku: 'STK-ARC-001',
      name: 'Arc Reactor Core (Prototype)',
      barcode: '0056789000001',
      description: 'Prototype arc reactor core assembly, generation 4',
      unitValue: 25000.0,
      customerId: stark.id,
    },
  });

  const starkProduct2 = await prisma.product.create({
    data: {
      sku: 'STK-PLT-002',
      name: 'Titanium Alloy Plating',
      barcode: '0056789000002',
      description: 'Grade-5 titanium alloy sheets, 3mm thickness, per square meter',
      unitValue: 780.0,
      customerId: stark.id,
    },
  });

  const starkProduct3 = await prisma.product.create({
    data: {
      sku: 'STK-ENG-003',
      name: 'Repulsor Engine Assembly',
      barcode: '0056789000003',
      description: 'Compact repulsor engine assembly, 50kN thrust rating',
      unitValue: 15500.0,
      customerId: stark.id,
    },
  });

  console.log('Creating warehouse locations...');

  const locationsData = [
    { code: 'AISLE-A-BAY1', zone: 'Aisle A', aisle: 'Bay 1-3', description: 'Level 1 — general storage' },
    { code: 'AISLE-B-BAY5', zone: 'Aisle B', aisle: 'Bay 5', description: 'Level 3 — small goods' },
    { code: 'AISLE-B-BAY12', zone: 'Aisle B', aisle: 'Bay 12', rack: 'Level 2' },
    { code: 'AISLE-D-BAY3', zone: 'Aisle D', aisle: 'Bay 3', description: 'Level 1' },
    { code: 'AISLE-F-BAY7', zone: 'Aisle F', aisle: 'Bay 7', description: 'Level 1' },
    { code: 'COLD-A-CS2', zone: 'Cold Storage A', aisle: 'Section CS-2' },
    { code: 'DOCK-1', zone: 'Receiving Dock 1', description: 'Inbound receiving area' },
    { code: 'DOCK-2-STAGE', zone: 'Receiving Dock 2', description: 'Staging Area' },
    { code: 'DOCK-3-TEST', zone: 'Loading Dock 3', description: 'Testing Station' },
    { code: 'HAZ-H5', zone: 'Hazmat Storage', aisle: 'Row H-5' },
    { code: 'HAZ-H9', zone: 'Hazmat Storage', aisle: 'Row H-9' },
    { code: 'HM-SECT2', zone: 'Heavy Materials Bay', description: 'Section HM-2' },
    { code: 'HVAULT-1', zone: 'High-Value Storage', description: 'Cage HV-1' },
    { code: 'HVAULT-3', zone: 'High-Value Storage', description: 'Cage HV-3' },
    { code: 'IT-SHELF-R4', zone: 'IT Storage Room', rack: 'Shelf R-4' },
    { code: 'IT-SHELF-R6', zone: 'IT Storage Room', rack: 'Shelf R-6' },
    { code: 'MEZ-M3', zone: 'Mezzanine Level', description: 'Section M-3' },
    { code: 'OVFL-BAY11', zone: 'Overflow Storage', description: 'Bay OV-11' },
    { code: 'SECT-C-BAY8', zone: 'Section C', aisle: 'Bay 8', description: 'Level 1' },
  ];

  const createdLocations: Record<string, WarehouseLocation> = {};
  for (const loc of locationsData) {
    const created = await prisma.warehouseLocation.create({ data: loc });
    createdLocations[created.code] = created;
  }

  console.log('Creating damage reports...');

  const now = new Date();

  const reporters = [admin, manager1, manager2, warehouse1, warehouse2, warehouse3];

  // Old status → new status mapping:
  // DRAFT, REPORTED → OPEN
  // UNDER_REVIEW → CUSTOMER_NOTIFIED
  // CUSTOMER_NOTIFIED → CUSTOMER_NOTIFIED
  // CLAIM_FILED → DESTROY_STOCK
  // RESOLVED → CLOSED
  // WRITTEN_OFF → CLOSED

  interface DamageData {
    referenceNumber: string;
    customerId: string;
    productId: string;
    quantity: number;
    severity: DamageSeverity | null;
    cause: DamageCause;
    causeOther: string | null;
    description: string;
    warehouseLocationId: string | null;
    status: DamageStatus;
    estimatedLoss: number;
    reportedById: string;
    reviewedById: string | null;
    dateOfDamage: Date;
    dateReported: Date;
    dateResolved: Date | null;
  }

  const damageData: DamageData[] = [
    {
      referenceNumber: 'DMG-20241101-0001',
      customerId: acme.id,
      productId: acmeProduct1.id,
      quantity: 12,
      severity: DamageSeverity.MODERATE,
      cause: DamageCause.FORKLIFT_IMPACT,
      causeOther: null,
      description: 'Forklift operator clipped the corner of pallet stack B-12 while reversing. Approximately 12 units of Super Widget Pro sustained crush damage to packaging and product casing.',
      warehouseLocationId: createdLocations['AISLE-B-BAY12'].id,
      status: DamageStatus.CLOSED,
      estimatedLoss: 1799.88,
      reportedById: warehouse1.id,
      reviewedById: manager1.id,
      dateOfDamage: subDays(now, 83),
      dateReported: subDays(now, 82),
      dateResolved: subDays(now, 75),
    },
    {
      referenceNumber: 'DMG-20241105-0001',
      customerId: stark.id,
      productId: starkProduct1.id,
      quantity: 1,
      severity: DamageSeverity.TOTAL_LOSS,
      cause: DamageCause.DROPPED_DURING_HANDLING,
      causeOther: null,
      description: 'Arc Reactor Core prototype dropped from mezzanine level during transfer operation. Unit fell approximately 4.5 meters, resulting in catastrophic structural failure. Unit is non-recoverable.',
      warehouseLocationId: createdLocations['MEZ-M3'].id,
      status: DamageStatus.DESTROY_STOCK,
      estimatedLoss: 25000.0,
      reportedById: warehouse2.id,
      reviewedById: manager2.id,
      dateOfDamage: subDays(now, 79),
      dateReported: subDays(now, 79),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20241112-0001',
      customerId: globex.id,
      productId: globexProduct1.id,
      quantity: 3,
      severity: DamageSeverity.MAJOR,
      cause: DamageCause.PALLET_FAILURE,
      causeOther: null,
      description: 'Wooden pallet failed under load causing 3 industrial solvent tanks to tip and roll. Two tanks are dented and one sustained a seam crack. Contents were contained but units are compromised.',
      warehouseLocationId: createdLocations['HAZ-H5'].id,
      status: DamageStatus.CUSTOMER_NOTIFIED,
      estimatedLoss: 960.0,
      reportedById: warehouse3.id,
      reviewedById: manager1.id,
      dateOfDamage: subDays(now, 72),
      dateReported: subDays(now, 72),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20241118-0001',
      customerId: wayne.id,
      productId: wayneProduct1.id,
      quantity: 2,
      severity: DamageSeverity.MAJOR,
      cause: DamageCause.WATER_DAMAGE,
      causeOther: null,
      description: 'Roof leak above storage area C-8 during heavy rainfall. Two Advanced Power Cell units exposed to water intrusion overnight. Cells show signs of electrolyte seepage and are deemed unsafe for use.',
      warehouseLocationId: createdLocations['SECT-C-BAY8'].id,
      status: DamageStatus.DESTROY_STOCK,
      estimatedLoss: 17500.0,
      reportedById: warehouse1.id,
      reviewedById: admin.id,
      dateOfDamage: subDays(now, 65),
      dateReported: subDays(now, 64),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20241122-0001',
      customerId: initech.id,
      productId: initechProduct1.id,
      quantity: 1,
      severity: DamageSeverity.MAJOR,
      cause: DamageCause.CRUSH_DAMAGE,
      causeOther: null,
      description: 'Rack mount server unit crushed when overloaded shelving unit collapsed. Unit sustained significant board-level damage. Hard drives may be recoverable but chassis and motherboard are total loss.',
      warehouseLocationId: createdLocations['IT-SHELF-R4'].id,
      status: DamageStatus.CUSTOMER_NOTIFIED,
      estimatedLoss: 4500.0,
      reportedById: warehouse2.id,
      reviewedById: manager2.id,
      dateOfDamage: subDays(now, 58),
      dateReported: subDays(now, 58),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20241129-0001',
      customerId: acme.id,
      productId: acmeProduct2.id,
      quantity: 6,
      severity: DamageSeverity.MODERATE,
      cause: DamageCause.INCORRECT_STACKING,
      causeOther: null,
      description: 'Six pairs of Rocket Skates stacked beyond maximum recommended height. Lower boxes deformed under weight causing product damage to units in bottom three boxes. Packaging failure with product scuffing.',
      warehouseLocationId: createdLocations['AISLE-D-BAY3'].id,
      status: DamageStatus.OPEN,
      estimatedLoss: 2994.0,
      reportedById: warehouse3.id,
      reviewedById: null,
      dateOfDamage: subDays(now, 51),
      dateReported: subDays(now, 51),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20241203-0001',
      customerId: stark.id,
      productId: starkProduct2.id,
      quantity: 15,
      severity: DamageSeverity.MINOR,
      cause: DamageCause.TRANSIT_DAMAGE_INBOUND,
      causeOther: null,
      description: 'Titanium alloy plating sheets arrived with corner dents and surface scratches from transit. Carrier packaging was insufficient for the load. 15 sheets have cosmetic damage but may be usable pending customer approval.',
      warehouseLocationId: createdLocations['DOCK-2-STAGE'].id,
      status: DamageStatus.CUSTOMER_NOTIFIED,
      estimatedLoss: 2925.0,
      reportedById: warehouse1.id,
      reviewedById: manager1.id,
      dateOfDamage: subDays(now, 47),
      dateReported: subDays(now, 47),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20241210-0001',
      customerId: globex.id,
      productId: globexProduct2.id,
      quantity: 2,
      severity: DamageSeverity.MAJOR,
      cause: DamageCause.TEMPERATURE_EXPOSURE,
      causeOther: null,
      description: 'Temperature monitoring system failure in cold storage section caused capacitor arrays to be exposed to temperatures exceeding 40°C for approximately 8 hours. Electrolytic components likely degraded.',
      warehouseLocationId: createdLocations['COLD-A-CS2'].id,
      status: DamageStatus.CUSTOMER_NOTIFIED,
      estimatedLoss: 2500.0,
      reportedById: manager2.id,
      reviewedById: manager2.id,
      dateOfDamage: subDays(now, 40),
      dateReported: subDays(now, 39),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20241215-0001',
      customerId: wayne.id,
      productId: wayneProduct2.id,
      quantity: 1,
      severity: DamageSeverity.MINOR,
      cause: DamageCause.PACKAGING_FAILURE,
      causeOther: null,
      description: 'Encrypted communications module arrived with tampered-looking packaging. Inner protective foam had shifted and unit shows minor cosmetic scratching on casing. Functional testing required before acceptance.',
      warehouseLocationId: createdLocations['HVAULT-1'].id,
      status: DamageStatus.OPEN,
      estimatedLoss: 320.0,
      reportedById: warehouse2.id,
      reviewedById: null,
      dateOfDamage: subDays(now, 35),
      dateReported: subDays(now, 35),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20241218-0001',
      customerId: initech.id,
      productId: initechProduct2.id,
      quantity: 8,
      severity: DamageSeverity.MINOR,
      cause: DamageCause.FORKLIFT_IMPACT,
      causeOther: null,
      description: 'Forklift forks punctured through the base of a pallet of ergonomic office chairs during retrieval. Eight boxes sustained puncture and tear damage to packaging. Chair bases on bottom units are scratched.',
      warehouseLocationId: createdLocations['AISLE-F-BAY7'].id,
      status: DamageStatus.CLOSED,
      estimatedLoss: 551.0,
      reportedById: warehouse3.id,
      reviewedById: manager1.id,
      dateOfDamage: subDays(now, 32),
      dateReported: subDays(now, 32),
      dateResolved: subDays(now, 25),
    },
    {
      referenceNumber: 'DMG-20241222-0001',
      customerId: acme.id,
      productId: acmeProduct3.id,
      quantity: 20,
      severity: DamageSeverity.MODERATE,
      cause: DamageCause.WATER_DAMAGE,
      causeOther: null,
      description: 'Sprinkler system activated due to false alarm in Section A. Approximately 20 Portable Hole Kit units stored on bottom shelf were soaked. Product material is water-sensitive and all units are considered damaged.',
      warehouseLocationId: createdLocations['AISLE-A-BAY1'].id,
      status: DamageStatus.CLOSED,
      estimatedLoss: 1799.0,
      reportedById: warehouse1.id,
      reviewedById: admin.id,
      dateOfDamage: subDays(now, 28),
      dateReported: subDays(now, 28),
      dateResolved: subDays(now, 20),
    },
    {
      referenceNumber: 'DMG-20250102-0001',
      customerId: stark.id,
      productId: starkProduct3.id,
      quantity: 1,
      severity: DamageSeverity.MAJOR,
      cause: DamageCause.DROPPED_DURING_HANDLING,
      causeOther: null,
      description: 'Repulsor engine assembly dropped during manual unloading. Unit slipped from hand truck due to inadequate securing straps. Nozzle assembly is fractured and housing shows dents. Likely non-functional.',
      warehouseLocationId: createdLocations['DOCK-1'].id,
      status: DamageStatus.CUSTOMER_NOTIFIED,
      estimatedLoss: 15500.0,
      reportedById: warehouse2.id,
      reviewedById: manager2.id,
      dateOfDamage: subDays(now, 21),
      dateReported: subDays(now, 21),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20250108-0001',
      customerId: globex.id,
      productId: globexProduct1.id,
      quantity: 1,
      severity: DamageSeverity.MINOR,
      cause: DamageCause.PEST_DAMAGE,
      causeOther: null,
      description: 'Rodent activity discovered near pallet stack in section H. One industrial solvent tank has gnaw marks on the outer label and protective wrapping. Tank integrity appears intact but requires inspection.',
      warehouseLocationId: createdLocations['HAZ-H9'].id,
      status: DamageStatus.OPEN,
      estimatedLoss: 320.0,
      reportedById: warehouse3.id,
      reviewedById: null,
      dateOfDamage: subDays(now, 15),
      dateReported: subDays(now, 15),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20250114-0001',
      customerId: wayne.id,
      productId: wayneProduct1.id,
      quantity: 1,
      severity: DamageSeverity.MODERATE,
      cause: DamageCause.TRANSIT_DAMAGE_OUTBOUND,
      causeOther: null,
      description: 'Customer reported receiving advanced power cell with visible transit damage. External shipping data confirms unit left warehouse undamaged but arrived with dented casing. Investigating carrier liability.',
      warehouseLocationId: null,
      status: DamageStatus.REP_COLLECT,
      estimatedLoss: 8750.0,
      reportedById: manager1.id,
      reviewedById: manager1.id,
      dateOfDamage: subDays(now, 9),
      dateReported: subDays(now, 8),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20250118-0001',
      customerId: initech.id,
      productId: initechProduct1.id,
      quantity: 2,
      severity: DamageSeverity.MODERATE,
      cause: DamageCause.UNKNOWN,
      causeOther: null,
      description: 'Two rack mount server units found with cracked front bezels during routine inventory check. No incident was reported. Investigating CCTV footage to determine cause. Damage appears to be impact-related.',
      warehouseLocationId: createdLocations['IT-SHELF-R6'].id,
      status: DamageStatus.CUSTOMER_NOTIFIED,
      estimatedLoss: 900.0,
      reportedById: manager2.id,
      reviewedById: manager2.id,
      dateOfDamage: subDays(now, 5),
      dateReported: subDays(now, 5),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20250120-0001',
      customerId: acme.id,
      productId: acmeProduct1.id,
      quantity: 4,
      severity: DamageSeverity.MINOR,
      cause: DamageCause.PACKAGING_FAILURE,
      causeOther: null,
      description: 'Four Super Widget Pro units found with compromised packaging. Shrink wrap failed allowing units to shift. Products show minor scratches but appear functional. Customer approval needed before release.',
      warehouseLocationId: createdLocations['AISLE-B-BAY5'].id,
      status: DamageStatus.OPEN,
      estimatedLoss: 599.96,
      reportedById: warehouse1.id,
      reviewedById: null,
      dateOfDamage: subDays(now, 3),
      dateReported: subDays(now, 3),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20250121-0001',
      customerId: stark.id,
      productId: starkProduct2.id,
      quantity: 5,
      severity: DamageSeverity.MINOR,
      cause: DamageCause.INCORRECT_STACKING,
      causeOther: null,
      description: 'Titanium alloy plating sheets were stored vertically instead of horizontally per handling guidelines. Five sheets developed warping due to gravity stress over time. Sheets exceed flatness tolerance.',
      warehouseLocationId: createdLocations['HM-SECT2'].id,
      status: DamageStatus.OPEN,
      estimatedLoss: 3900.0,
      reportedById: warehouse3.id,
      reviewedById: null,
      dateOfDamage: subDays(now, 2),
      dateReported: subDays(now, 2),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20250122-0001',
      customerId: globex.id,
      productId: globexProduct2.id,
      quantity: 1,
      severity: DamageSeverity.TOTAL_LOSS,
      cause: DamageCause.OTHER,
      causeOther: 'Electrical surge during loading dock power restoration',
      description: 'Power was restored to loading dock after maintenance and an electrical surge propagated through the dock equipment. One high-voltage capacitor array connected to testing equipment received the surge and is completely destroyed.',
      warehouseLocationId: createdLocations['DOCK-3-TEST'].id,
      status: DamageStatus.OPEN,
      estimatedLoss: 1250.0,
      reportedById: warehouse2.id,
      reviewedById: null,
      dateOfDamage: subDays(now, 1),
      dateReported: subDays(now, 1),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20250123-0001',
      customerId: wayne.id,
      productId: wayneProduct2.id,
      quantity: 3,
      severity: DamageSeverity.MODERATE,
      cause: DamageCause.FORKLIFT_IMPACT,
      causeOther: null,
      description: 'New forklift operator misjudged clearance in high-value storage cage and impacted shelving unit. Three encrypted communications modules fell to the floor from shelf height. All units require inspection.',
      warehouseLocationId: createdLocations['HVAULT-3'].id,
      status: DamageStatus.OPEN,
      estimatedLoss: 9600.0,
      reportedById: warehouse1.id,
      reviewedById: null,
      dateOfDamage: subHours(now, 4),
      dateReported: subHours(now, 2),
      dateResolved: null,
    },
    {
      referenceNumber: 'DMG-20250123-0002',
      customerId: initech.id,
      productId: initechProduct2.id,
      quantity: 3,
      severity: DamageSeverity.MINOR,
      cause: DamageCause.EXPIRED_PRODUCT,
      causeOther: null,
      description: 'Three ergonomic office chairs from an old shipment found to have foam degradation beyond acceptable limits. Chairs were stored for over 36 months and foam cushioning has hardened and cracked.',
      warehouseLocationId: createdLocations['OVFL-BAY11'].id,
      status: DamageStatus.OPEN,
      estimatedLoss: 826.5,
      reportedById: warehouse3.id,
      reviewedById: null,
      dateOfDamage: subHours(now, 1),
      dateReported: subHours(now, 1),
      dateResolved: null,
    },
  ];

  const createdReports: Array<{ id: string; status: DamageStatus; reportedById: string; reviewedById: string | null }> = [];

  for (const damage of damageData) {
    const report = await prisma.damageReport.create({
      data: damage,
    });
    createdReports.push({
      id: report.id,
      status: report.status,
      reportedById: damage.reportedById,
      reviewedById: damage.reviewedById,
    });
  }

  console.log('Creating status history...');

  const statusProgressions: Record<string, DamageStatus[]> = {
    OPEN: [DamageStatus.OPEN],
    CUSTOMER_NOTIFIED: [DamageStatus.OPEN, DamageStatus.CUSTOMER_NOTIFIED],
    DESTROY_STOCK: [DamageStatus.OPEN, DamageStatus.CUSTOMER_NOTIFIED, DamageStatus.DESTROY_STOCK],
    REP_COLLECT: [DamageStatus.OPEN, DamageStatus.CUSTOMER_NOTIFIED, DamageStatus.REP_COLLECT],
    CLOSED: [DamageStatus.OPEN, DamageStatus.CUSTOMER_NOTIFIED, DamageStatus.DESTROY_STOCK, DamageStatus.CLOSED],
  };

  for (let i = 0; i < createdReports.length; i++) {
    const report = createdReports[i];
    const damageInfo = damageData[i];
    const progression = statusProgressions[report.status] || [DamageStatus.OPEN];

    for (let j = 0; j < progression.length; j++) {
      const status = progression[j];
      const previousStatus = j > 0 ? progression[j - 1] : null;
      const changedBy = j === 0 ? damageInfo.reportedById : (damageInfo.reviewedById || damageInfo.reportedById);
      const user = reporters.find(u => u.id === changedBy);
      const changedByUser = user ? `${user.firstName} ${user.lastName}` : 'System';

      const historyDate = new Date(damageInfo.dateReported);
      historyDate.setHours(historyDate.getHours() + j * 24);

      await prisma.statusHistory.create({
        data: {
          damageReportId: report.id,
          fromStatus: previousStatus,
          toStatus: status,
          changedBy,
          changedByUser,
          note: j === 0 ? 'Damage report created' : getStatusNote(status),
          createdAt: historyDate,
        },
      });
    }
  }

  console.log('Creating comments...');

  const commentData = [
    { reportIndex: 0, userId: manager1.id, content: 'I have reviewed the forklift footage. This appears to be operator error. Retraining scheduled for next week.' },
    { reportIndex: 0, userId: warehouse1.id, content: 'Customer has been contacted and agreed to replacement from next shipment. Damaged units have been set aside for disposal.' },
    { reportIndex: 1, userId: manager2.id, content: 'Insurance claim submitted. Stark Industries is requesting a full incident report and CCTV footage from the time of incident.' },
    { reportIndex: 1, userId: admin.id, content: 'CCTV footage pulled and forwarded to insurance provider. Awaiting claim number from Stark Industries.' },
    { reportIndex: 3, userId: admin.id, content: 'Roof repair contractor contacted. Temporary waterproofing in place. Wayne Enterprises notified and insurance claim process initiated.' },
    { reportIndex: 3, userId: manager1.id, content: 'Wayne Enterprises legal team involved. They are requesting detailed documentation of storage conditions and the roof maintenance schedule.' },
    { reportIndex: 4, userId: manager2.id, content: 'Investigating shelving load ratings vs. actual stored weight. Preliminary findings suggest overloading. Full report to follow.' },
    { reportIndex: 9, userId: manager1.id, content: 'Customer offered 50% credit on next order as goodwill gesture. They accepted. Claim closed.' },
    { reportIndex: 11, userId: manager2.id, content: 'CCTV footage reviewed. No clear view of incident. Interviewing warehouse staff on shift at the time.' },
    { reportIndex: 13, userId: manager1.id, content: 'Carrier confirmed damage occurred during transit. Lodging formal complaint and claim with logistics provider. Reference: CARRIER-2025-00847.' },
  ];

  for (const comment of commentData) {
    const report = createdReports[comment.reportIndex];
    await prisma.damageComment.create({
      data: {
        damageReportId: report.id,
        userId: comment.userId,
        content: comment.content,
      },
    });
  }

  console.log('Creating branding settings...');

  await prisma.brandingSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'DamageTrack',
      tagline: 'Warehouse Damage Management',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e293b',
      accentColor: '#10b981',
    },
  });

  console.log('Creating system settings...');

  await prisma.systemSetting.createMany({
    data: [
      { key: 'company_name', value: 'DamageTrack' },
      { key: 'default_email_recipients', value: '' },
      { key: 'email_signature', value: 'DamageTrack - Warehouse Damage Management System' },
      { key: 'max_photos_per_report', value: '10' },
      { key: 'auto_notify_customer_on_status_change', value: 'false' },
      { key: 'currency_symbol', value: '$' },
      { key: 'date_format', value: 'dd/MM/yyyy' },
      { key: 'timezone', value: 'America/New_York' },
    ],
  });

  console.log('Seed completed successfully!');
  console.log(`Created:`);
  console.log(`  - 6 users (1 admin, 2 managers, 3 warehouse)`);
  console.log(`  - 5 customers`);
  console.log(`  - 12 products`);
  console.log(`  - 19 warehouse locations`);
  console.log(`  - 20 damage reports`);
  console.log(`  - Status histories and comments`);
  console.log(`  - 8 system settings`);
  console.log(`\nLogin credentials:`);
  console.log(`  Admin: admin / DamageTrack2024! (must change password)`);
  console.log(`  Manager: sjohnson / Manager2024!`);
  console.log(`  Manager: mchen / Manager2024!`);
  console.log(`  Warehouse: jriley / Warehouse2024!`);
  console.log(`  Warehouse: msantos / Warehouse2024!`);
  console.log(`  Warehouse: dpatel / Warehouse2024!`);
}

function getStatusNote(status: DamageStatus): string {
  const notes: Record<DamageStatus, string> = {
    OPEN: 'Report created',
    CUSTOMER_NOTIFIED: 'Customer has been notified of the damage',
    DESTROY_STOCK: 'Stock marked for destruction',
    REP_COLLECT: 'Rep/customer to collect stock',
    CLOSED: 'Report closed, all actions completed',
  };
  return notes[status] || 'Status updated';
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
