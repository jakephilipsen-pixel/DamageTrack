import { PrismaClient } from "@prisma/client";

/**
 * Generate a damage report reference number in the format DMG-YYYYMMDD-XXXX
 * where XXXX is a sequential counter per day (0001, 0002, etc.)
 */
export async function generateReference(prisma: PrismaClient, date: Date): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  const prefix = `DMG-${dateStr}-`;

  // Find the highest existing reference for this date
  const lastReport = await prisma.damageReport.findFirst({
    where: {
      reference: { startsWith: prefix },
    },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  let nextNum = 1;
  if (lastReport) {
    const lastNumStr = lastReport.reference.slice(prefix.length);
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  const counter = String(nextNum).padStart(4, "0");
  return `${prefix}${counter}`;
}
