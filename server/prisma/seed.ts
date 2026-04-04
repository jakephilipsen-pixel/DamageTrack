import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed users
  const users = [
    { username: "admin", password: "GoC0ld2024!", role: "ADMIN" },
    { username: "warehouse", password: "Warehouse1!", role: "WAREHOUSE" },
    { username: "transport", password: "Transport1!", role: "TRANSPORT" },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { username: user.username },
      update: { password: hash, role: user.role },
      create: { username: user.username, password: hash, role: user.role },
    });
    console.log(`  User: ${user.username} (${user.role})`);
  }

  // Seed employees
  const employees = [
    { name: "Brendo" },
    { name: "Davo" },
    { name: "Richo" },
    { name: "Muzza" },
  ];

  for (const emp of employees) {
    const existing = await prisma.employee.findFirst({
      where: { name: emp.name },
    });
    if (!existing) {
      await prisma.employee.create({ data: emp });
      console.log(`  Employee: ${emp.name}`);
    } else {
      console.log(`  Employee: ${emp.name} (already exists)`);
    }
  }

  // Seed reasons
  const reasons = [
    "Forklift damage",
    "Dropped during handling",
    "Crushed in transit",
    "Water/moisture damage",
    "Temperature excursion",
    "Incorrect stacking",
  ];

  for (const text of reasons) {
    await prisma.reason.upsert({
      where: { text },
      update: {},
      create: { text },
    });
    console.log(`  Reason: ${text}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
